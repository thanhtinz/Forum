import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username chỉ chứa chữ, số và dấu gạch dưới' })
  username: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  @MaxLength(100)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  inviteCode?: string;

  @IsOptional()
  @IsString()
  captchaToken?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  code?: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

// Đăng nhập Google: chỉ nhận ID token (JWT) do Google Identity Services ký —
// backend TỰ xác thực chữ ký/audience với Google, không tin bất kỳ trường nào
// client tự khai (email/providerId...) để tránh giả mạo tài khoản.
export class GoogleLoginDto {
  @IsString()
  idToken: string;
}
