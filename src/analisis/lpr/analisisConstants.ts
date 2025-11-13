import { IconGauge, IconUsersGroup, IconWorld } from '@tabler/icons-react';

export type AnalisisAvanzadoSubTab = 'velocidad' | 'lanzadera' | 'matriculas';

export type SubTabDefinition = {
    value: AnalisisAvanzadoSubTab;
    label: string;
    icon: typeof IconGauge;
    color: string;
};

export const ANALISIS_AVANZADO_SUBTABS: SubTabDefinition[] = [
    { value: 'velocidad', label: 'Vehículos rápidos', icon: IconGauge, color: '#1d4ed8' },
    { value: 'lanzadera', label: 'Vehículo acompañante', icon: IconUsersGroup, color: '#9333ea' },
    { value: 'matriculas', label: 'Matrículas extranjeras', icon: IconWorld, color: '#059669' }
];


