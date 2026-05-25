import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { UserRepository } from '../repositories/users';
import { JWT_CONFIG } from './constants';

const userRepo = new UserRepository();

passport.use(
  new LocalStrategy(
    {
      usernameField: 'phone',
      passwordField: 'password',
    },
    async (phone, password, done) => {
      try {
        const user = await userRepo.findByPhone(phone);
        
        if (!user) {
          return done(null, false, { message: 'Invalid phone or password' });
        }
        
        const isValidPassword = await userRepo.verifyPassword(password, user.password);
        
        if (!isValidPassword) {
          return done(null, false, { message: 'Invalid phone or password' });
        }
        
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (error) {
        return done(error);
      }
    }
  )
);

const jwtSecret = JWT_CONFIG.SECRET || JWT_CONFIG.FALLBACK_SECRET;

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
    },
    async (jwtPayload, done) => {
      try {
        const user = await userRepo.findByPhone(jwtPayload.phone);
        
        if (!user) {
          return done(null, false);
        }
        
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

export default passport;