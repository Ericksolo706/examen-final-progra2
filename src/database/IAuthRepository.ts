import type { RolUsuario } from '../models/Laboratorio';
import type { UsuarioSesion } from '../models/UsuarioSesion';

export interface ResultadoRegistro {
  sesion: UsuarioSesion | null;
  requiereConfirmacion: boolean;
}

export interface IAuthRepository {
  registrar(
    correo: string,
    contrasena: string,
    nombre: string,
    carnet: string,
    carrera: string,
    fotoUrl: string,
    rol: RolUsuario,
  ): Promise<ResultadoRegistro>;
  iniciarSesion(correo: string, contrasena: string): Promise<UsuarioSesion>;
  iniciarSesionPrueba(rol: RolUsuario): Promise<UsuarioSesion>;
  actualizarPerfil(
    usuario: UsuarioSesion,
    nombre: string,
    carnet: string,
    carrera: string,
    fotoUrl: string,
  ): Promise<UsuarioSesion>;
  cerrarSesion(): Promise<void>;
  obtenerSesion(): Promise<UsuarioSesion | null>;
  escucharCambios(alCambiar: (usuario: UsuarioSesion | null) => void): () => void;
}
