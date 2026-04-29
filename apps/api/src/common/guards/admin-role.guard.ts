import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';
import { AuthUser } from '../types/auth-user.type';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication is required');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin role is required');
    }

    return true;
  }
}
