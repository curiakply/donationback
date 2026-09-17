const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');
const session = require('express-session');
// Configure the local strategy
// Inside passport.js
passport.use(new LocalStrategy(
    {
      usernameField: 'email',   
      passwordField: 'password'
    },
    async (email, password, done) => {
      try {
        console.log('Attempting to find user:', email);
        const user = await User.findOne({ email });
        
        if (!user) {
          console.log('User not found');
          return done(null, false, { message: 'Incorrect email or password.' });
        }
        
        console.log('User found, checking password');
        if (user.password !== password) {
            console.log(user.password);
            console.log(password);
            return done(null, false, { message: 'Incorrect email or password.' });
          }
        
       // if (!isMatch) {
       //   console.log('Password does not match');
        //  return done(null, false, { message: 'Incorrect email or password.' });
       // }
        
        console.log('Password match, user authenticated');
        return done(null, user);
        
      } catch (error) {
        console.error('Authentication error:', error);
        return done(error);
      }
    }
  ));
  passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});
module.exports = passport; 