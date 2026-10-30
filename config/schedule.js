// schedule.js
// Configuracion de los jobs programados
//
// cada + unidad: cada cuanto corre el job (cualquier numero entero)
//   unidad: 'segundos' | 'minutos' | 'horas'
//   Si el numero cuadra con el reloj (segundos/minutos: 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30;
//   horas: 1, 2, 3, 4, 6, 8, 12) se usa cron: ej. cada 20 minutos = a los :00, :20 y :40.
//   Cualquier otro numero (ej. 50 segundos) usa un intervalo fijo desde que arranca el scheduler.
// dias: 'todos' o lista: ['lunes', 'miercoles', 'viernes']
// dispositivos: 'todos' o nombres de cypress/fixtures/devices.json
// paginas: 'todas' o ids de cypress/fixtures/pages.json

module.exports = {
    zonaHoraria: 'America/Bogota',
    jobs: [
        {
            nombre: 'movil',
            habilitado: true,
            cada: 30,
            unidad: 'segundos',
            dias: 'todos',
            dispositivos: ['Pixel 7', 'iPhone 14 Pro Max'],
            paginas: 'todas'
        },
        {
            nombre: 'escritorio',
            habilitado: true,
            cada: 30,
            unidad: 'segundos',
            dias: 'todos',
            dispositivos: ['Desktop'],
            paginas: 'todas'
        }
    ]
}
