// schedule.js
// Configuracion de los jobs programados
//
// cada + unidad: cada cuanto corre el job
//   unidad: 'segundos' | 'minutos' | 'horas'
//   segundos y minutos: 1, 2, 3, 4, 5, 6, 10, 12, 15, 20 o 30
//   horas: 1, 2, 3, 4, 6, 8 o 12
// dias: 'todos' o lista: ['lunes', 'miercoles', 'viernes']
// dispositivos: 'todos' o nombres de cypress/fixtures/devices.json
// paginas: 'todas' o ids de cypress/fixtures/pages.json

module.exports = {
    zonaHoraria: 'America/Bogota',
    jobs: [
        {
            nombre: 'movil',
            habilitado: true,
            cada: 1,
            unidad: 'minutos',
            dias: 'todos',
            dispositivos: ['Pixel 7', 'iPhone 14 Pro Max'],
            paginas: 'todas'
        },
        {
            nombre: 'escritorio',
            habilitado: true,
            cada: 1,
            unidad: 'minutos',
            dias: 'todos',
            dispositivos: ['Desktop'],
            paginas: 'todas'
        }
    ]
}
