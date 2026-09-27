/* Humor: marcas de pizza parodicas, tiendas, carteles, frases y consejos */
'use strict';

G.Humor = (() => {
  const H = {
    // pizzerias de la competencia (fachadas especiales)
    brands: [
      { name: 'PIZZA RÁPIDA', tag: '¡30 MIN... O 3 DÍAS!', col: '#e0302a', col2: '#ffd21f', rival: true },
      { name: 'DOMÍNGUEZ', tag: 'SOLO ABRIMOS DOMINGOS', col: '#2f6fd0', col2: '#ffffff' },
      { name: 'PIZZA JAT', tag: 'SE ESCRIBE COMO SUENA', col: '#c8302a', col2: '#2a2a2a' },
      { name: 'PAPÁ JONÁS', tag: 'COMO LA DE MAMÁ', col: '#2f9e5a', col2: '#ffffff' },
      { name: 'LA NONNA', tag: 'ENFADADA DESDE 1952', col: '#8a3a3a', col2: '#ffe0a0' },
      { name: 'TELEFUNGHI', tag: 'LLAME Y ESPERE SENTADO', col: '#f07a22', col2: '#ffffff' },
      { name: 'PIZZA NOSTRA', tag: 'UNA OFERTA IRRECHAZABLE', col: '#2a2a3a', col2: '#e0302a' },
      { name: 'MARGARITO', tag: 'MÁS QUESO QUE PIZZA', col: '#d8508a', col2: '#fff0f8' },
    ],
    // tiendas del barrio (Avenida Atardecer)
    shops: [
      'PAN COMIDO', 'BAR MANOLO', 'VEO VEO', 'TORNILLO FLOJO', 'FLORES Y RENCORES', 'CAFÉ CON PRISAS',
      'PELOS A LA MAR', 'FARMACIA 23H', 'FRUTAS PERAS', 'CERO CARBOS GYM', 'AUTOESCUELA FRENAZO',
      'TAPAS Y TAPONES', 'HELADOS BRRR', 'TODO A 1 €', 'CERRAJERÍA ÁBRETE', 'BAR EL PALILLO',
      'LIBROS SIN FINAL', 'ZAPATERÍA PIES', 'TINTE Y TINTO', 'CHURROS PORRAS', 'MERCERÍA HILO',
    ],
    // neones del Distrito Neon
    neon: [
      'SUSHI O NO SUSHI', 'KARAOKE DESAFINA2', 'RAMEN-TIRAS', 'ARCADE 1UP', 'BAR PERDIDO', 'CINE PALOMITAS',
      'CLUB INSOMNIO', 'TACOS LOCOS', 'WIFI GRATIS*', 'NOODLES', 'KEBAB ESPACIAL', 'DISCO BOLA', 'HOTEL 5★*',
      '24H (CASI)', 'MANGA Y MANGO', 'CÓMICS', 'BOLERA STRIKE', 'LÁSER TAG',
    ],
    rooftop: ['RAMEN-TIRAS', 'ARCADE 1UP', 'KARAOKE', 'NOODLES', 'PACHINKO', 'LAVANDERÍA', 'DISCO BOLA', 'MANGA Y MANGO'],
    vertical: ['HOTEL', 'BAR', 'CLUB', 'NEÓN', 'JAZZ', 'MOTEL', 'SUSHI', 'CINE'],
    // Costa Tormenta
    coast: ['HELADOS', 'CHIRINGUITO', 'SURF OLA K ASE', 'FLOTADORES', 'PESCAO FRESCO'],
    // vallas publicitarias (dos lineas)
    billboards: [
      ['¿PIZZA FRÍA?', '¡LLAMA A GOM!'],
      ['PIZZA RÁPIDA', 'AHORA 3% MÁS QUESO'],
      ['LA DIETA', 'EMPIEZA EL LUNES'],
      ['SEGUROS', '"CHOQUÉ OTRA VEZ"'],
      ['MATCH-ZARELLA', 'LA APP DE CITAS'],
      ['BUFANDAS XXXL', 'PARA CUELLOS LARGOS'],
      ['¿PIÑA EN LA PIZZA?', 'DEBATE HOY 21H'],
      ['PIZZA RÁPIDA', 'CASI SIEMPRE LLEGA'],
      ['MOZZARELLA', 'TE QUIERO FUNDIDA'],
      ['VOTA A GOM', 'ALCALDE DE LA PIZZA'],
      ['CERO CARBOS GYM', 'PIZZA DESPUÉS'],
      ['OSICONOS PERFECTOS', 'PELUQUERÍA JIRAFA'],
      ['PIZZA RÁPIDA', 'EL CARTÓN ES GRATIS'],
      ['DOMÍNGUEZ', 'HOY NO. EL DOMINGO'],
      ['¿ESTRÉS?', 'COME PIZZA'],
      ['HAWAIANA', 'LA PIZZA DE LA DISCORDIA'],
    ],
    // senales de trafico (icono + texto de la placa)
    signs: {
      giraffe: ['JIRAFAS', 'CRUZANDO'],
      speed: ['LÍMITE: LO QUE', 'AGUANTE LA PIZZA'],
      works: ['OBRAS', 'NO NOS PERDONEN'],
      gull: ['GAVIOTAS', 'LADRONAS'],
      phone: ['ZOMBIS', 'DEL MÓVIL'],
      noparking: ['PROHIBIDO APARCAR', 'JIRAFAS'],
      pizza: ['PIZZERÍA GOM', 'CALIENTE O GRATIS*'],
      wave: ['OLAS', 'CON MALA LECHE'],
      rival: ['PIZZA RÁPIDA', 'NO ADELANTAR (PORFA)'],
    },
    // frases de los clientes
    served: ['¡CALENTITA!', '¡5 ESTRELLAS!', '¡TOMA PROPINA!', '¡POR FIN!', '¡OLE!', '¡GRACIAS, GOM!', '¡HUELE A GLORIA!', '¡MAMMA MIA!', '¡QUÉ PUNTERÍA!', '¡MI HÉROE!'],
    perfect: ['¡DE CUELLO!', '¡AL MILÍMETRO!', '¡CRACK!', '¡PIZZA-TÁSTICO!', '¡NI SE HA MOVIDO EL QUESO!', '¡ESO ES ARTE!'],
    lost: ['...¿Y MI PIZZA?', 'LLAMO A PIZZA RÁPIDA', '¡ME MUERO DE HAMBRE!', '¡VUELVE!', '¡ESTABA AQUÍ!', 'CENARÉ CEREALES...', 'UNA ESTRELLA. CERO.'],
    stolen: ['¿ROJA? ¿FRÍA? BUENO...', 'SABE A CARTÓN', 'ESTO NO ES LO QUE PEDÍ', '¿Y LA JIRAFA?'],
    vip: ['SOY VIP', 'SIN PIÑA, PORFA', 'EXTRA DE QUESO', 'PAGO EN MONEDAS'],
    // peatones con movil
    phone: ['...', '¡UN LIKE!', '¿HAY WIFI?', 'JAJAJA', '#SINFILTRO', 'UN SEC...', '¡MI STORY!', '¿DÓNDE ESTOY?', 'ESCRIBIENDO...', '¡99 MENSAJES!'],
    scared: ['¡EH!', '¡MI MÓVIL!', '¡CASI!', '¡OYE!', '¡JIRAFA LOCA!', '¡QUE ME GRABAN!'],
    // GOM
    gomCrash: ['¡AY, MI CUELLO!', '¡MIS OSICONOS!', '¡QUÉ TORTAZO!', '¡OTRA VEZ NO!', '¡LA PIZZA ESTÁ BIEN!', '¡NO ME LO PUEDO CREER!'],
    gomTurbo: ['¡MOZZARELLA A TOPE!', '¡QUE ARDA EL QUESO!', '¡AGÁRRATE, PIZZA!'],
    gomLowTime: ['¡QUE SE ENFRÍA!', '¡CORRE, CUELLO!'],
    // la competencia
    rival: ['PIZZA RÁPIDA', '¡30 MIN O 3 DÍAS!', '¡APARTA, JIRAFA!', '¡ESE PEDIDO ES MÍO!'],
    overtake: ['¡CHÚPATE ESA, PIZZA RÁPIDA!', '¡ADIÓS, LENTORRO!', '¡A COMER POLVO!', '¡PITA MÁS FUERTE!'],
    // barrios
    biomeTag: {
      sunset: 'HOGAR DE GOM · PIÑA NO BIENVENIDA',
      neon: 'AQUÍ NADIE DUERME, NI LAS PIZZAS',
      storm: 'GAVIOTAS CON ANTECEDENTES',
    },
    // fin de partida
    endTime: ['LA PIZZA SE ENFRIÓ. EL CLIENTE TAMBIÉN.', 'PIZZA RÁPIDA SE RÍE A LO LEJOS', 'EL QUESO YA NO SE ESTIRA', 'HASTA LAS GAVIOTAS PASAN DE ELLA'],
    endCrash: ['GOM NECESITA UN CUELLO ORTOPÉDICO', 'LA PIZZA SOBREVIVIÓ. TÚ, MÁS O MENOS', 'EL SEGURO NO CUBRE JIRAFAS', 'CONDUCIR MIRANDO LA PIZZA NO VALE'],
    tips: [
      'CONSEJO: LAS GAVIOTAS NO PAGAN. LANZA EN PERFECTO.',
      'CONSEJO: EL CASCO ES OBLIGATORIO. LA PIÑA, NO.',
      'DATO: GOM TIENE 7 VÉRTEBRAS EN EL CUELLO. COMO TÚ, PERO XXL.',
      'CONSEJO: LOS ZOMBIS DEL MÓVIL NO TE VEN. TÚ A ELLOS, SÍ.',
      'DATO: PIZZA RÁPIDA NUNCA HA LLEGADO A TIEMPO. NUNCA.',
      'CONSEJO: ROZAR COCHES CARGA EL TURBO. CHOCAR, NO TANTO.',
      'CONSEJO: EN EL AIRE, LAS ENTREGAS VALEN EL DOBLE.',
      'DATO: LA MOZZARELLA FUNDE A 60 GRADOS. GOM, NUNCA.',
      'CONSEJO: 5 ENTREGAS SEGUIDAS ACTIVAN LA PIZZA FEVER.',
      'CONSEJO: PASA POR LA BAHÍA DE CARGA: +3 SEGUNDOS.',
      'DATO: LOS OSICONOS SON LOS CUERNITOS DE LA JIRAFA. DE NADA.',
      'CONSEJO: EN TURBO ARROLLAS CONOS. A LOS PEATONES, NO.',
      'DATO: DOMÍNGUEZ PIZZA SOLO ABRE LOS DOMINGOS. HOY NO.',
      'CONSEJO: ADELANTA A LA FURGONETA ROJA O TE ROBA CLIENTES.',
    ],
  };

  const pick = (arr, rng) => arr[Math.floor((rng ? rng.next() : Math.random()) * arr.length)];
  // elige un texto que quepa en un ancho dado (px, fuente 5x7)
  function fit(arr, maxW, rng) {
    const ok = arr.filter((s) => G.Font.measure(s) <= maxW);
    if (ok.length) return pick(ok, rng);
    return arr.slice().sort((a, b) => a.length - b.length)[0];
  }

  return Object.assign(H, { pick, fit });
})();
