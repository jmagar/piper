"use client";

import { AlertCircle, HelpCircle, Server, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MCPServerConfig } from '../types';
import { listItemVariants } from '../animations';

interface ServerItemProps {
  serverName: string;
  serverConfig: MCPServerConfig;
  index: number;
  isEditing: boolean;
  hasErrors: boolean;
  errors: string[];
  updateServerValue: (
    serverName: string, 
    key: 'command' | 'args' | 'env', 
    value: string | string[] | Record<string, string> | undefined
  ) => void;
  removeServer: (serverName: string) => void;
}

export const ServerItem = ({
  serverName,
  serverConfig,
  index,
  isEditing,
  hasErrors,
  errors,
  updateServerValue,
  removeServer
}: ServerItemProps) => {
  return (
    <motion.div
      key={serverName}
      custom={index}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={listItemVariants}
      className="border rounded-lg p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Server className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">{serverName}</h3>
          {hasErrors && (
            <Badge variant="destructive" className="text-xs">
              Invalid
            </Badge>
          )}
        </div>
        {isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeServer(serverName)}
            className="h-8 w-8 p-0 rounded-full"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remove</span>
          </Button>
        )}
      </div>
      
      {/* Server validation errors */}
      {hasErrors && (
        <Alert variant="destructive" className="bg-destructive/10 text-destructive text-sm py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">Validation errors</AlertTitle>
          <AlertDescription className="mt-1">
            <ul className="list-disc pl-5 space-y-1 text-xs">
              {errors.map((err, i) => (
                <li key={i}>{err.replace(`${serverName}: `, '')}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {isEditing ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${serverName}-command`} className="text-sm">
              Command
            </Label>
            <Input
              id={`${serverName}-command`}
              value={serverConfig.command}
              onChange={(e) => updateServerValue(serverName, 'command', e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`${serverName}-args`} className="text-sm">
              Arguments (comma-separated)
            </Label>
            <Input
              id={`${serverName}-args`}
              value={serverConfig.args.join(',')}
              onChange={(e) => {
                const args = e.target.value.split(',').map(arg => arg.trim());
                updateServerValue(serverName, 'args', args);
              }}
              className="h-8 text-sm"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`${serverName}-env`} className="text-sm flex items-center">
              <span>Environment Variables</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1">
                      <HelpCircle className="h-3 w-3" />
                      <span className="sr-only">Help</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Format: KEY=value,ANOTHER=value</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id={`${serverName}-env`}
              value={serverConfig.env ? 
                Object.entries(serverConfig.env).map(([key, value]) => `${key}=${value}`).join(',') : 
                ''
              }
              onChange={(e) => {
                const envPairs = e.target.value.split(',').filter(Boolean);
                const env: Record<string, string> = {};
                
                envPairs.forEach(pair => {
                  const [key, ...valueParts] = pair.split('=');
                  if (key && valueParts.length) {
                    env[key.trim()] = valueParts.join('=').trim();
                  }
                });
                
                updateServerValue(serverName, 'env', 
                  Object.keys(env).length > 0 ? env : undefined
                );
              }}
              className="h-8 text-sm"
              placeholder="KEY=value,ANOTHER=value"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <span className="font-semibold min-w-24">Command:</span>
            <code className="bg-muted p-1 rounded text-xs">{serverConfig.command}</code>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold min-w-24">Arguments:</span>
            <div className="flex flex-wrap gap-1">
              {serverConfig.args.map((arg, i) => (
                <Badge 
                  key={i} 
                  variant="secondary"
                  className="text-xs"
                >
                  {arg}
                </Badge>
              ))}
            </div>
          </div>
          {serverConfig.env && Object.keys(serverConfig.env).length > 0 && (
            <div className="flex items-start space-x-2">
              <span className="font-semibold min-w-24">Environment:</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(serverConfig.env).map(([key, value], i) => (
                  <Badge 
                    key={i} 
                    variant="outline"
                    className="text-xs"
                  >
                    {key}={value}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
