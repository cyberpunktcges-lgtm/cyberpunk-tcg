/**
 * Catálogo de Avatares Oficiales de Personajes para Cyberpunk TCG
 * Imágenes situadas en /images/avatars/<archivo>
 */
export const AVATARS = [
  {
    id: 'v-female',
    name: 'V // FEMALE',
    title: 'SOLO // MERCENARIA NIGHT CITY',
    faction: 'Afterlife',
    image: '/images/avatars/v-female.webp',
    fallbackIcon: 'User',
    color: '#0dfceb',
    quote: 'No tengo tiempo que perder en chorradas corporativas.'
  },
  {
    id: 'v-male',
    name: 'V // MALE',
    title: 'NETRUNNER // LEYENDA DEL AFTERLIFE',
    faction: 'Afterlife',
    image: '/images/avatars/v-male.webp',
    fallbackIcon: 'User',
    color: '#0dfceb',
    quote: 'Nunca dejes de luchar por sobrevivir en esta ciudad.'
  },
  {
    id: 'judy',
    name: 'JUDY ALVAREZ',
    title: 'MOX // TÉCNICA DE BRAINDANCE',
    faction: 'Mox',
    image: '/images/avatars/judy.webp',
    fallbackIcon: 'User',
    color: '#00F0FF',
    quote: 'La gente como nosotros no tiene finales felices en Night City.'
  },
  {
    id: 'evelyn',
    name: 'EVELYN PARKER',
    title: 'CLOUDS // INTERMEDIARIA AMBICIOSA',
    faction: 'Clouds',
    image: '/images/avatars/evelyn.webp',
    fallbackIcon: 'User',
    color: '#b55fe6',
    quote: 'Esta ciudad solo te da una oportunidad real. Hay que arriesgarlo todo.'
  },
  {
    id: 'dum-dum',
    name: 'DUM DUM',
    title: 'MAELSTROM // ADICTO AL CIBERWARE',
    faction: 'Maelstrom',
    image: '/images/avatars/dum-dum.webp',
    fallbackIcon: 'Bot',
    color: '#FF003C',
    quote: '¿Quieres probar un poco de inhalador Black Lace? Relaja los circuitos.'
  },
  {
    id: 'david',
    name: 'DAVID MARTINEZ',
    title: 'EDGERUNNER // PILOTO DEL SANDEVISTAN',
    faction: 'Santo Domingo',
    image: '/images/avatars/david.webp',
    fallbackIcon: 'Zap',
    color: '#FCEE0A',
    quote: 'Soy especial. Te llevaré a lo más alto de la torre Arasaka, mamá.'
  },
  {
    id: 'lucy',
    name: 'LUCY KUSHINADA',
    title: 'NETRUNNER // FANTASMA DE LA RED',
    faction: 'Edgerunners',
    image: '/images/avatars/lucy.webp',
    fallbackIcon: 'Sparkles',
    color: '#0dfceb',
    quote: 'La Luna parece pacífica desde aquí abajo. Algún día iré allí.'
  },
  {
    id: 'rebecca',
    name: 'REBECCA',
    title: 'SOLO // GATILLO FÁCIL & ESCOPETAS',
    faction: 'Edgerunners',
    image: '/images/avatars/rebecca.webp',
    fallbackIcon: 'Flame',
    color: '#00ff88',
    quote: '¡Dispara primero, luego pregunta los nombres en la morgue!'
  },
  {
    id: 'adam-smasher',
    name: 'ADAM SMASHER',
    title: 'ARASAKA // MONSTRUO DE CIBERWARE',
    faction: 'Arasaka',
    image: '/images/avatars/adam-smasher.webp',
    fallbackIcon: 'Bot',
    color: '#FF003C',
    quote: 'Pareces un pedazo de carne susceptible de ser aplastada.'
  },
  {
    id: 'johnny',
    name: 'JOHNNY SILVERHAND',
    title: 'ROCKERBOY // TERRORISTA CORPORATIVO',
    faction: 'Samurai',
    image: '/images/avatars/johnny.webp',
    fallbackIcon: 'Flame',
    color: '#FCEE0A',
    quote: 'Despierta, Samurai. Tenemos una ciudad que quemar.'
  },
  {
    id: 'panam',
    name: 'PANAM PALMER',
    title: 'ALDECALDOS // FRANCOTIRADORA NÓMADA',
    faction: 'Aldecaldos',
    image: '/images/avatars/panam.webp',
    fallbackIcon: 'User',
    color: '#ff8800',
    quote: 'La familia nómada nunca te dejará tirado en mitad de las Badlands.'
  },
  {
    id: 'takemura',
    name: 'GORO TAKEMURA',
    title: 'ARASAKA // EX-GUARDAESPALDAS IMPERIAL',
    faction: 'Arasaka',
    image: '/images/avatars/takemura.webp',
    fallbackIcon: 'Shield',
    color: '#FF003C',
    quote: 'El honor y la lealtad no se negocian con la chusma de las calles.'
  },
  {
    id: 'ray-bot',
    name: 'RAY // CORPO BOT',
    title: 'IA DE COMBATE // SERVIDORES ARASAKA',
    faction: 'Arasaka',
    image: '/images/avatars/ray-bot.webp',
    fallbackIcon: 'Bot',
    color: '#FF003C',
    quote: 'Algoritmo de cálculo de probabilidades de victoria: 99.8%.'
  }
];

export const DEFAULT_PLAYER_AVATAR = AVATARS[0]; // V Female (o Male)
export const DEFAULT_BOT_AVATAR = AVATARS[12];   // Ray Corpo Bot
