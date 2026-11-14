import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { RolUsuario } from '../models/Laboratorio';
import type { UsuarioSesion } from '../models/UsuarioSesion';
import type { IAuthRepository, ResultadoRegistro } from './IAuthRepository';
import { tieneEnvConfigurado } from './supabase';
import { traducirErrorAuth } from './traducirErrorAuth';

// Avatar generico de silueta "sin foto de perfil"
export const AVATAR_POR_DEFECTO =
  'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y&s=200';

// Traduce el User de Supabase al modelo de la app
function mapearUsuario(usuario: User, perfil?: any): UsuarioSesion {
  const meta = usuario.user_metadata ?? {};
  const fotoGuardada = perfil?.foto_url || meta.fotoUrl || '';
  return {
    id: usuario.id,
    correo: usuario.email ?? '',
    nombre: perfil?.nombre_completo ?? meta.nombre ?? usuario.email?.split('@')[0] ?? 'Usuario',
    carnet: perfil?.carnet ?? meta.carnet ?? '',
    carrera: perfil?.carrera ?? meta.carrera ?? '',
    fotoUrl: fotoGuardada.trim().startsWith('http') ? fotoGuardada.trim() : AVATAR_POR_DEFECTO,
    rol: (perfil?.rol ?? meta.rol ?? 'Estudiante') as RolUsuario,
    correoConfirmado: Boolean(usuario.email_confirmed_at),
  };
}

export class SupabaseAuthRepository implements IAuthRepository {
  constructor(private cliente: SupabaseClient) {}

  async registrar(
    correo: string,
    contrasena: string,
    nombre: string,
    carnet: string,
    carrera: string,
    fotoUrl: string,
    rol: RolUsuario,
  ): Promise<ResultadoRegistro> {
    const fotoFinal = fotoUrl.trim().startsWith('http') ? fotoUrl.trim() : AVATAR_POR_DEFECTO;

    if (!tieneEnvConfigurado) {
      const sesionLocal: UsuarioSesion = {
        id: `usr-${Date.now()}`,
        correo,
        nombre,
        carnet,
        carrera,
        fotoUrl: fotoFinal,
        rol,
        correoConfirmado: true,
      };
      await AsyncStorage.setItem('perfil_actual', JSON.stringify(sesionLocal));
      return { sesion: sesionLocal, requiereConfirmacion: false };
    }

    const { data, error } = await this.cliente.auth.signUp({
      email: correo,
      password: contrasena,
      options: {
        data: { nombre, carnet, carrera, fotoUrl: fotoFinal, rol },
      },
    });
    if (error) throw new Error(traducirErrorAuth(error));
    if (!data.user) throw new Error('No se pudo completar el registro');

    await this.cliente.from('perfiles').upsert({
      id: data.user.id,
      correo,
      nombre_completo: nombre,
      carnet,
      carrera,
      foto_url: fotoFinal,
      rol,
    });

    const sesion = data.session ? mapearUsuario(data.session.user) : null;
    if (sesion) {
      await AsyncStorage.setItem('perfil_actual', JSON.stringify(sesion));
    }

    return {
      sesion,
      requiereConfirmacion: data.session === null,
    };
  }

  async iniciarSesion(correo: string, contrasena: string): Promise<UsuarioSesion> {
    if (!tieneEnvConfigurado) {
      const esAdmin = correo.toLowerCase().includes('admin');
      return this.iniciarSesionPrueba(esAdmin ? 'Administrador' : 'Estudiante');
    }

    const { data, error } = await this.cliente.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });
    if (error) throw new Error(traducirErrorAuth(error));

    const { data: perfil } = await this.cliente
      .from('perfiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    const sesion = mapearUsuario(data.user, perfil);
    await AsyncStorage.setItem('perfil_actual', JSON.stringify(sesion));
    return sesion;
  }

  async iniciarSesionPrueba(rol: RolUsuario): Promise<UsuarioSesion> {
    const esAdmin = rol === 'Administrador';
    const sesionPrueba: UsuarioSesion = {
      id: esAdmin
        ? '00000000-0000-0000-0000-000000000001'
        : '00000000-0000-0000-0000-000000000002',
      correo: esAdmin ? 'admin@umg.edu.gt' : 'esolorzano@miumg.edu.gt',
      nombre: esAdmin ? 'Administrador de Laboratorio' : 'Erick Efrain Solorzano Jimenez',
      carnet: esAdmin ? 'ADMIN-01' : '0907-25-79532',
      carrera: 'Ingenieria en Sistemas',
      fotoUrl: AVATAR_POR_DEFECTO,
      rol,
      correoConfirmado: true,
    };
    await AsyncStorage.setItem('perfil_actual', JSON.stringify(sesionPrueba));
    return sesionPrueba;
  }

  async actualizarPerfil(
    usuario: UsuarioSesion,
    nombre: string,
    carnet: string,
    carrera: string,
    fotoUrl: string,
  ): Promise<UsuarioSesion> {
    const fotoFinal = fotoUrl.trim().startsWith('http') ? fotoUrl.trim() : AVATAR_POR_DEFECTO;

    if (tieneEnvConfigurado) {
      await this.cliente.auth
        .updateUser({
          data: {
            nombre,
            carnet,
            carrera,
            fotoUrl: fotoFinal,
            rol: usuario.rol,
          },
        })
        .catch(() => {});

      await this.cliente.from('perfiles').upsert({
        id: usuario.id,
        correo: usuario.correo,
        nombre_completo: nombre,
        carnet,
        carrera,
        foto_url: fotoFinal,
        rol: usuario.rol,
      });
    }

    const actualizado: UsuarioSesion = {
      ...usuario,
      nombre,
      carnet,
      carrera,
      fotoUrl: fotoFinal,
    };

    await AsyncStorage.setItem('perfil_actual', JSON.stringify(actualizado));
    return actualizado;
  }

  async cerrarSesion(): Promise<void> {
    if (tieneEnvConfigurado) {
      await this.cliente.auth.signOut().catch(() => {});
    }
    await AsyncStorage.removeItem('perfil_actual');
  }

  async obtenerSesion(): Promise<UsuarioSesion | null> {
    const guardada = await AsyncStorage.getItem('perfil_actual');
    if (guardada) {
      return JSON.parse(guardada) as UsuarioSesion;
    }

    if (!tieneEnvConfigurado) {
      return null;
    }

    const { data, error } = await this.cliente.auth.getSession();
    if (error || !data.session) return null;

    const { data: perfil } = await this.cliente
      .from('perfiles')
      .select('*')
      .eq('id', data.session.user.id)
      .maybeSingle();

    const sesion = mapearUsuario(data.session.user, perfil);
    await AsyncStorage.setItem('perfil_actual', JSON.stringify(sesion));
    return sesion;
  }

  escucharCambios(alCambiar: (usuario: UsuarioSesion | null) => void): () => void {
    if (!tieneEnvConfigurado) {
      return () => {};
    }
    const { data } = this.cliente.auth.onAuthStateChange((_evento, sesion) => {
      alCambiar(sesion ? mapearUsuario(sesion.user) : null);
    });
    return () => data.subscription.unsubscribe();
  }
}
