import type { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown, Info } from 'lucide-react';
import { toast } from 'sonner';

import type { TemplateFormState, DocTypeOption, CategoryOption } from './new-template-types';

export interface NewTemplateBasicInfoProps {
  templateData: TemplateFormState;
  docTypeOptions: DocTypeOption[];
  categoryOptions: CategoryOption[];
  loadingDocTypes: boolean;
  loadingCategories: boolean;
  selectedDocType: DocTypeOption | undefined;
  selectedCategory: CategoryOption | undefined;
  onTemplateDataChange: (changes: Partial<TemplateFormState>) => void;
  onRequestLoadDocTypes: (search: string) => void;
  onRequestLoadCategories: (search: string) => void;
  onDescriptionChange: (value: string) => void;
}

export const NewTemplateBasicInfo: FC<NewTemplateBasicInfoProps> = ({
  templateData,
  docTypeOptions,
  categoryOptions,
  loadingDocTypes,
  loadingCategories,
  selectedDocType,
  selectedCategory,
  onTemplateDataChange,
  onRequestLoadDocTypes,
  onRequestLoadCategories,
  onDescriptionChange,
}) => {
  const [openTypePopover, setOpenTypePopover] = useState(false);
  const [openCategoryPopover, setOpenCategoryPopover] = useState(false);
  const [typeSearch, setTypeSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  const handleCodeChange = (value: string): void => {
    onTemplateDataChange({ code: value });
  };

  const handleNameChange = (value: string): void => {
    onTemplateDataChange({ name: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground text-lg">Información Básica</h3>

      <div className="gap-4 grid md:grid-cols-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label className="font-medium text-foreground text-sm">Código de la Plantilla</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 p-0 text-muted-foreground">
                  <Info className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 text-xs space-y-1">
                <p className="font-semibold">Sugerencias para el código</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Debe ser único (no repetido).</li>
                  <li>Usa mayúsculas y guiones bajos.</li>
                  <li>
                    Ejemplo: <span className="font-mono">CERT_CURSO_BASICO</span>
                  </li>
                </ul>
              </PopoverContent>
            </Popover>
          </div>
          <Input
            type="text"
            name="code"
            placeholder="Ej: CERT_CURSO_BASICO"
            value={templateData.code}
            onChange={(e) => handleCodeChange(e.target.value)}
            required
            className="bg-muted border-border"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium text-foreground text-sm">Nombre de la Plantilla</label>
          <Input
            type="text"
            name="name"
            placeholder="Ej: Certificado Taller Go 2025"
            value={templateData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className="bg-muted border-border"
          />
        </div>
      </div>

      <div className="gap-4 grid md:grid-cols-2">
        {/* Tipo de documento */}
        <div className="space-y-2">
          <label className="block font-medium text-foreground text-sm">Tipo de Documento</label>
          <Popover
            open={openTypePopover}
            onOpenChange={(open) => {
              setOpenTypePopover(open);
              if (open) {
                onRequestLoadDocTypes(typeSearch);
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" role="combobox" aria-expanded={openTypePopover} className="justify-between w-full" disabled={loadingDocTypes}>
                {selectedDocType ? `${selectedDocType.name}` : 'Selecciona un tipo...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput
                  placeholder="Buscar tipo..."
                  value={typeSearch}
                  onValueChange={(value) => {
                    setTypeSearch(value);
                    onRequestLoadDocTypes(value);
                  }}
                />
                <CommandList>
                  <CommandEmpty>No se encontraron tipos</CommandEmpty>
                  <CommandGroup>
                    {docTypeOptions.map((dt) => (
                      <CommandItem
                        key={dt.id}
                        value={dt.code}
                        onSelect={() => {
                          onTemplateDataChange({
                            document_type_id: dt.id,
                            category_id: '',
                          });
                          setOpenTypePopover(false);
                        }}
                      >
                        <Check className={`mr-2 h-4 w-4 ${dt.id === templateData.document_type_id ? 'opacity-100' : 'opacity-0'}`} />
                        {dt.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Categoría */}
        <div className="space-y-2">
          <label className="block font-medium text-foreground text-sm">Categoría</label>
          <Popover
            open={openCategoryPopover}
            onOpenChange={(open) => {
              if (open && !templateData.document_type_id) {
                toast.error('Primero selecciona un tipo de documento');
                return;
              }
              setOpenCategoryPopover(open);
              if (open) {
                onRequestLoadCategories(categorySearch);
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={openCategoryPopover}
                className="justify-between w-full"
                disabled={loadingCategories || !templateData.document_type_id}
              >
                {selectedCategory ? `${selectedCategory.name}` : 'Selecciona una categoría...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput
                  placeholder="Buscar categoría..."
                  value={categorySearch}
                  onValueChange={(value) => {
                    setCategorySearch(value);
                    onRequestLoadCategories(value);
                  }}
                />
                <CommandList>
                  <CommandEmpty>No se encontraron categorías</CommandEmpty>
                  <CommandGroup>
                    {categoryOptions.map((cat) => (
                      <CommandItem
                        key={cat.id}
                        value={cat.code}
                        onSelect={() => {
                          onTemplateDataChange({
                            category_id: cat.id.toString(),
                          });
                          setOpenCategoryPopover(false);
                        }}
                      >
                        <Check className={`mr-2 h-4 w-4 ${cat.id === Number(templateData.category_id) ? 'opacity-100' : 'opacity-0'}`} />
                        {cat.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div>
        <label className="block mb-2 font-medium text-foreground text-sm">Descripción</label>
        <textarea
          name="description"
          placeholder="Describe el propósito de esta plantilla..."
          value={templateData.description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="bg-muted px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary w-full text-foreground"
          rows={3}
        />
      </div>
    </div>
  );
};

// hook local que necesita el componente
import { useState } from 'react';
