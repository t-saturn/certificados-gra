import type { ModuleItem } from '@/types/modules';

/**
 * Procesa una lista de módulos para agregar información del padre
 * @param modules Lista de módulos
 * @returns Lista de módulos con información del padre procesada
 */
export const enrichModulesWithParentInfo = (modules: ModuleItem[]): ModuleItem[] => {
  // Crear un mapa para búsqueda rápida
  const moduleMap = new Map<string, ModuleItem>();
  modules.forEach((m) => moduleMap.set(m.id, m));

  // Enriquecer cada módulo con información del padre
  return modules.map((module) => {
    if (module.parent_id) {
      const parent = moduleMap.get(module.parent_id);

      if (parent) {
        return {
          ...module,
          parent: {
            id: parent.id,
            name: parent.name,
          },
        };
      } else {
        // El padre no existe en la lista actual (puede estar eliminado o en otra página)
        return {
          ...module,
          parent: {
            id: module.parent_id,
            name: '(Padre no disponible)',
          },
        };
      }
    }

    return {
      ...module,
      parent: null,
    };
  });
};
