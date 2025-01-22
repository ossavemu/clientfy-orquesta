import type { NextFunction, Request, Response } from 'express';
import type { server } from './server';
import type { InstanceStatus } from './services/instanceStateManager';

type Server = typeof server;

interface GeneratePasswordRequest extends Request {
  body: {
    email: string;
  };
}

interface PasswordInfo {
  password: string;
  email: string;
  timestamp: string;
  created_at: string;
  updated_at: string;
}

interface InstanceInfo {
  instanceName: string;
  ip: string | null;
  state: string;
  created: string;
  numberphone: string;
  dropletId: number;
}

interface InstanceState {
  status: InstanceStatus | string;
  progress: number;
  error: string | null;
  instanceInfo: InstanceInfo | null;
  lastRestart?: string;
  deletedAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

interface ErrorResponse {
  error: string;
  stack?: string;
}

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  maxmemory: string;
  maxmemoryPolicy: string;
}

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface PasswordService {
  generatePassword(): string;
  validatePassword(_password: string): boolean;
}

interface EmailService {
  sendEmail(_to: string, _subject: string, _body: string): Promise<void>;
}

interface CustomRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

type MiddlewareFunction = (
  _req: CustomRequest,
  _res: Response,
  _next: NextFunction
) => Promise<void> | void;

interface WebSocketMessage {
  type: 'auth' | 'heartbeat';
  password?: string;
  success?: boolean;
  message?: string;
}

interface WebSocketClient {
  id: string;
  authenticated: boolean;
  lastHeartbeat: Date;
}

type Nullable<T> = T | null;
type Optional<T> = T | undefined;

interface RetryOptions {
  retries: number;
  delay: number;
  onRetry?: (_error: Error, _attempt: number) => void;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface Validator<T> {
  validate(_data: T): ValidationResult;
}

interface CreateDropletParams {
  instanceName: string;
  numberphone: string;
  provider: string;
  userData: string;
}

interface Droplet {
  id: number;
  name: string;
  memory: number;
  vcpus: number;
  disk: number;
  status: string;
  created_at: string;
  networks: {
    v4: Array<{
      ip_address: string;
      netmask: string;
      gateway: string;
      type: string;
    }>;
    v6: Array<{
      ip_address: string;
      netmask: string;
      gateway: string;
      type: string;
    }>;
  };
  region: {
    name: string;
    slug: string;
  };
  image: {
    id: number;
    name: string;
    distribution: string;
  };
  size_slug: string;
  tags: string[];
}

interface DODroplet {
  id: number;
  name: string;
  status: string;
  created_at: string;
  networks: {
    v4: Array<{
      type: string;
      ip_address: string;
    }>;
  };
  memory: number;
  disk: number;
  region: {
    name: string;
  };
}

interface DOSnapshot {
  id: string;
  name: string;
  created_at: string;
  regions: string[];
  min_disk_size: number;
  size_gigabytes: number;
}

interface SimpleDroplet {
  id: number;
  name: string;
  status: string;
  created: string;
  ip?: string;
  memory: number;
  disk: number;
  region: string;
}

interface CreateInstanceBody {
  numberphone: string;
  provider?: string;
  enableAppointments?: boolean;
  enableAutoInvite?: boolean;
}

interface CustomResponse extends Partial<Response> {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

interface FileUploadRequest extends Request {
  formData: () => Promise<FormData>;
}

interface TrainingResponse {
  files?: Array<{ name: string; url: string }>;
}

interface ImageResponse {
  urls?: string[];
  images?: Array<{ name: string; url: string }>;
  files?: string[];
}

interface S3SuccessResponse {
  success: true;
  url: string;
  name: string;
}

interface S3ErrorResponse {
  success: false;
  error: string;
}

type S3Response = S3SuccessResponse | S3ErrorResponse;

type FileUploadHandler = (
  _req: FileUploadRequest,
  _res: Response,
  _next: NextFunction
) => Promise<void>;
