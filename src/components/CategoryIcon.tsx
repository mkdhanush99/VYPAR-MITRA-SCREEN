import {
  Briefcase,
  Building2,
  Camera,
  Factory,
  Fish,
  Gem,
  GraduationCap,
  Grid2x2,
  Hammer,
  HardHat,
  Megaphone,
  Package,
  Scissors,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Sprout,
  Stethoscope,
  Truck,
  Utensils,
  Wrench,
} from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
}

export function CategoryIcon({ name, className = 'w-5 h-5' }: CategoryIconProps) {
  switch (name) {
    case 'ShoppingBasket':
      return <ShoppingBasket className={className} />;
    case 'Utensils':
      return <Utensils className={className} />;
    case 'Shirt':
      return <Shirt className={className} />;
    case 'Smartphone':
      return <Smartphone className={className} />;
    case 'Sprout':
      return <Sprout className={className} />;
    case 'Fish':
      return <Fish className={className} />;
    case 'HardHat':
      return <HardHat className={className} />;
    case 'Stethoscope':
      return <Stethoscope className={className} />;
    case 'GraduationCap':
      return <GraduationCap className={className} />;
    case 'Wrench':
      return <Wrench className={className} />;
    case 'Scissors':
      return <Scissors className={className} />;
    case 'Hammer':
      return <Hammer className={className} />;
    case 'Camera':
      return <Camera className={className} />;
    case 'Gem':
      return <Gem className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Factory':
      return <Factory className={className} />;
    case 'Package':
      return <Package className={className} />;
    case 'Megaphone':
      return <Megaphone className={className} />;
    case 'Briefcase':
      return <Briefcase className={className} />;
    case 'Truck':
      return <Truck className={className} />;
    case 'Building2':
      return <Building2 className={className} />;
    default:
      return <Grid2x2 className={className} />;
  }
}
