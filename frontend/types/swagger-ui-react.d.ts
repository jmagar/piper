declare module 'swagger-ui-react' {
  import { ComponentType } from 'react';
  
  interface SwaggerUIProps {
    spec?: object;
    url?: string;
    docExpansion?: string;
    defaultModelsExpandDepth?: number;
    filter?: boolean;
    tryItOutEnabled?: boolean;
    supportedSubmitMethods?: string[];
    onComplete?: () => void;
    [key: string]: unknown;
  }
  
  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
} 