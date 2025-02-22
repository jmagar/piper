declare module 'swagger-ui-react' {
  import { ComponentType } from 'react';

  interface SwaggerUIProps {
    url?: string;
    spec?: object;
    supportedSubmitMethods?: string[];
    docExpansion?: 'list' | 'full' | 'none';
    defaultModelsExpandDepth?: number;
    requestInterceptor?: (req: any) => any;
    responseInterceptor?: (res: any) => any;
    onComplete?: () => void;
    plugins?: any[];
    layout?: string;
    defaultModelExpandDepth?: number;
    displayOperationId?: boolean;
    showMutatedRequest?: boolean;
    deepLinking?: boolean;
    presets?: any[];
    filter?: boolean;
    tryItOutEnabled?: boolean;
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
} 