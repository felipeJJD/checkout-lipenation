import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PersonalInfoFormProps {
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  ddi: string;
  setDdi: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  phoneRef: React.Ref<any>; // Para máscara
  cpfCnpj: string;
  setCpfCnpj: (value: string) => void;
  cpfCnpjRef: React.Ref<any>; // Para máscara
  errors: Record<string, string>;
}

export function PersonalInfoForm({
  name, setName, email, setEmail, ddi, setDdi, phone, setPhone, phoneRef,
  cpfCnpj, setCpfCnpj, cpfCnpjRef, errors
}: PersonalInfoFormProps) {
  return (
    <div className="space-y-3 md:space-y-4">
      <h3 className="mb-3 text-lg font-semibold md:mb-4">Seus dados</h3>
      {/* Nome */}
      <div className="grid gap-2">
        <Label htmlFor="name">Nome Completo</Label>
        <Input
          id="name"
          placeholder="Seu nome completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && <p id="name-error" className="text-sm text-red-600">{errors.name}</p>}
      </div>

      {/* Email */}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && <p id="email-error" className="text-sm text-red-600">{errors.email}</p>}
      </div>

      {/* DDI e Celular */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="grid gap-2 col-span-1">
          <Label htmlFor="ddi">DDI</Label>
          <Select value={ddi} onValueChange={setDdi}>
            <SelectTrigger id="ddi">
              <SelectValue placeholder="DDI" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="+55">Brasil +55</SelectItem>
              {/* Adicionar outros DDIs se necessário */}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 col-span-2">
          <Label htmlFor="phone">Celular</Label>
          <Input
            id="phone"
            ref={phoneRef} // Aplicar ref da máscara
            placeholder="(00) 00000-0000"
            onChange={(e) => setPhone(e.target.value)} // Usar onChange padrão, a máscara deve interceptar
            required
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
          />
          {errors.phone && <p id="phone-error" className="text-sm text-red-600">{errors.phone}</p>}
        </div>
      </div>

       {/* CPF/CNPJ */}
       <div className="grid gap-2">
        <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
        <Input
          id="cpfCnpj"
          ref={cpfCnpjRef} // Aplicar ref da máscara
          placeholder="000.000.000-00 ou 00.000.000/0000-00"
          onChange={(e) => setCpfCnpj(e.target.value)} // Usar onChange padrão, a máscara deve interceptar
          required
          aria-invalid={!!errors.cpfCnpj}
          aria-describedby={errors.cpfCnpj ? "cpfCnpj-error" : undefined}
        />
        {errors.cpfCnpj && <p id="cpfCnpj-error" className="text-sm text-red-600">{errors.cpfCnpj}</p>}
      </div>

    </div>
  );
} 
