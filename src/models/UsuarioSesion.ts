import type { RolUsuario } from './Laboratorio';

/**
 * Usuario autenticado, ya traducido al dominio de la app.
 * Incluye los datos del perfil (Estudiante o Administrador).
 */
export interface UsuarioSesion {
  id: string;
  correo: string;
  nombre: string;
  carnet: string;
  carrera: string;
  fotoUrl: string;
  rol: RolUsuario;
  correoConfirmado: boolean;
}
