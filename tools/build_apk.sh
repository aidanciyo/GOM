#!/usr/bin/env bash
# Compila el APK de GOM Pizza Delivery sin Gradle, con las herramientas del SDK
# empaquetadas en Ubuntu/Debian:
#   sudo apt-get install android-sdk-platform-23 aapt apksigner zipalign dalvik-exchange
#
# Uso:  tools/build_apk.sh            -> dist/GOM-Pizza-Delivery.apk
#       tools/build_apk.sh --install  -> ademas lo instala con adb en el movil conectado por USB
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDK="${ANDROID_SDK:-/usr/lib/android-sdk}"
ANDROID_JAR="${ANDROID_JAR:-$SDK/platforms/android-23/android.jar}"
BT="${BUILD_TOOLS:-$SDK/build-tools/debian}"
AAPT="${AAPT:-aapt}"
DX="${DX:-$BT/dx}"
ZIPALIGN="${ZIPALIGN:-zipalign}"
APKSIGNER="${APKSIGNER:-apksigner}"
OUT="$ROOT/build/apk"
DIST="$ROOT/dist"
APK="$DIST/GOM-Pizza-Delivery.apk"
# Clave de DEPURACION (no apta para Google Play): permite instalar versiones nuevas encima.
KEYSTORE="${KEYSTORE:-$ROOT/android/gom-debug.keystore}"
KS_PASS="${KS_PASS:-gompizza}"
KEY_ALIAS="${KEY_ALIAS:-gom}"

echo "==> Preparando carpetas"
rm -rf "$OUT"
mkdir -p "$OUT/assets/www" "$OUT/classes" "$DIST"

echo "==> Copiando el juego a assets/www"
cp -r "$ROOT/game/." "$OUT/assets/www/"
find "$OUT/assets/www" -name '_test*' -delete

echo "==> Empaquetando recursos y manifiesto (aapt)"
"$AAPT" package -f \
  -M "$ROOT/android/AndroidManifest.xml" \
  -S "$ROOT/android/res" \
  -A "$OUT/assets" \
  -I "$ANDROID_JAR" \
  -0 arsc -0 png -0 webp \
  -F "$OUT/unsigned.apk"

echo "==> Compilando Java"
javac -nowarn -Xlint:-options -source 8 -target 8 \
  -bootclasspath "$ANDROID_JAR" -classpath "$ANDROID_JAR" \
  -d "$OUT/classes" $(find "$ROOT/android/src" -name '*.java')

echo "==> Convirtiendo a DEX"
"$DX" --dex --min-sdk-version=21 --output="$OUT/classes.dex" "$OUT/classes"
(cd "$OUT" && "$AAPT" add -f unsigned.apk classes.dex > /dev/null)

echo "==> Alineando"
"$ZIPALIGN" -p -f 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"

if [ ! -f "$KEYSTORE" ]; then
  echo "==> Creando clave de depuracion"
  keytool -genkeypair -noprompt -keystore "$KEYSTORE" -storetype PKCS12 \
    -storepass "$KS_PASS" -keypass "$KS_PASS" -alias "$KEY_ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=GOM Pizza Delivery (debug), O=GOM, C=ES"
fi

echo "==> Firmando (v1 + v2)"
"$APKSIGNER" sign --ks "$KEYSTORE" --ks-pass "pass:$KS_PASS" --key-pass "pass:$KS_PASS" \
  --ks-key-alias "$KEY_ALIAS" --min-sdk-version 21 --out "$APK" "$OUT/aligned.apk"
"$APKSIGNER" verify --min-sdk-version 21 "$APK"
rm -f "$APK.idsig"

echo "==> Listo: $APK ($(du -h "$APK" | cut -f1))"

if [ "${1:-}" = "--install" ]; then
  echo "==> Instalando en el dispositivo USB"
  adb install -r "$APK"
  adb shell monkey -p com.gom.pizzadelivery -c android.intent.category.LAUNCHER 1 > /dev/null
fi
