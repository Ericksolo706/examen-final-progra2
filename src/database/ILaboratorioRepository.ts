import type {
  Equipo,
  EstadoPrestamo,
  NuevoEquipo,
  Prestamo,
  ReporteEquipo,
} from '../models/Laboratorio';

export interface ILaboratorioRepository {
  obtenerEquipos(): Promise<Equipo[]>;
  crearEquipo(datos: NuevoEquipo): Promise<void>;
  solicitarPrestamo(usuarioId: string, equipoId: number): Promise<void>;
  obtenerPrestamosUsuario(usuarioId: string): Promise<Prestamo[]>;
  obtenerPrestamos(): Promise<Prestamo[]>;
  cambiarEstadoPrestamo(
    prestamoId: number,
    equipoId: number,
    estadoActual: EstadoPrestamo,
    nuevoEstado: EstadoPrestamo,
  ): Promise<void>;
  obtenerReporteMasSolicitados(): Promise<ReporteEquipo[]>;
}
