export type AccentColor = 'default' | 'blue' | 'lightBlue' | 'green' | 'cornflower' | 'lime';

export interface AccentColorConfig {
  name: string;
  primary: string;
  hover: string;
  light: string;
  ring: string;
  gradient: string;
  fg: string;
}

export const accentColors: Record<AccentColor, AccentColorConfig> = {
  default: { name: 'Default', primary: '#FFFFFF', hover: '#E5E5E5', light: 'rgba(255, 255, 255, 0.1)', ring: 'rgba(255, 255, 255, 0.3)', gradient: '#CCCCCC', fg: '#000000' },
  blue: { name: 'Blue', primary: '#63B0FE', hover: '#4D9BE8', light: 'rgba(99, 176, 254, 0.1)', ring: 'rgba(99, 176, 254, 0.3)', gradient: '#3d8cdb', fg: '#000000' },
  lightBlue: { name: 'Light Blue', primary: '#9BC9FB', hover: '#83B3E6', light: 'rgba(155, 201, 251, 0.1)', ring: 'rgba(155, 201, 251, 0.3)', gradient: '#70a4db', fg: '#000000' },
  green: { name: 'Green', primary: '#95BC46', hover: '#7DA631', light: 'rgba(149, 188, 70, 0.1)', ring: 'rgba(149, 188, 70, 0.3)', gradient: '#688c22', fg: '#000000' },
  cornflower: { name: 'Soft Blue', primary: '#73B8FD', hover: '#5CA2E8', light: 'rgba(115, 184, 253, 0.1)', ring: 'rgba(115, 184, 253, 0.3)', gradient: '#478ad4', fg: '#000000' },
  lime: { name: 'Lime', primary: '#A5C256', hover: '#8FAC3E', light: 'rgba(165, 194, 86, 0.1)', ring: 'rgba(165, 194, 86, 0.3)', gradient: '#7a962a', fg: '#000000' },
};
