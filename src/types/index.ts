
export interface User {
  id?: string;
  name: string;
  email: string;
  profileComplete: boolean;
  avatar?: Avatar;
  cv?: string;
  pillars?: XimaPillars;
  mentor?: Mentor;
}

export interface Avatar {
  animal: string;
  image: string;
  features: AvatarFeature[];
}

export interface AvatarFeature {
  name: string;
  description: string;
  strength: number;
}

export interface XimaPillars {
  computational: number;
  communication: number;
  knowledge: number;
  creativity: number;
  drive: number;
}

export type PillarType = keyof XimaPillars;

export interface Mentor {
  id: string;
  name: string;
  avatar: Avatar;
  pillars: XimaPillars;
  specialtyPillar: PillarType;
}

export interface RegistrationForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}
