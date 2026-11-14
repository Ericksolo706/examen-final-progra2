export type RolUsuario = 'Estudiante' | 'Administrador';

export type EstadoPrestamo = 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Devuelto';

export interface PerfilUsuario {
  id: string;
  correo: string;
  nombre_completo: string;
  carnet: string;
  carrera: string;
  foto_url: string;
  rol: RolUsuario;
}

export interface Equipo {
  id: number;
  nombre: string;
  descripcion: string;
  imagen_url: string;
  disponible: boolean;
}

export type NuevoEquipo = Omit<Equipo, 'id'>;

export interface Prestamo {
  id: number;
  usuario_id: string;
  equipo_id: number;
  fecha_prestamo: string;
  fecha_devolucion: string;
  estado: EstadoPrestamo;
  perfiles?: {
    nombre_completo: string;
    carnet: string;
    carrera: string;
    correo: string;
  };
  equipos?: {
    nombre: string;
    imagen_url: string;
    disponible: boolean;
  };
}

export interface ReporteEquipo {
  equipo_id: number;
  nombre: string;
  total_solicitudes: number;
}
