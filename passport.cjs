require('react');
require('graphql');
require('lodash');
require('subscriptions-transport-ws');

const { generateApolloClient } = require("@deep-foundation/hasura/client");
const { DeepClient } = require('@deep-foundation/deeplinks/imports/client');
const { minilinks, Link } = require('@deep-foundation/deeplinks/imports/minilinks');

const apolloClient = generateApolloClient({
  path: process.env.NEXT_PUBLIC_GQL_PATH || '', // <<= HERE PATH TO UPDATE
  ssl: !!~process.env.NEXT_PUBLIC_GQL_PATH.indexOf('localhost') ? false : true,
  // admin token in prealpha deep secret key
  // token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2hhc3VyYS5pby9qd3QvY2xhaW1zIjp7IngtaGFzdXJhLWFsbG93ZWQtcm9sZXMiOlsibGluayJdLCJ4LWhhc3VyYS1kZWZhdWx0LXJvbGUiOiJsaW5rIiwieC1oYXN1cmEtdXNlci1pZCI6IjI2MiJ9LCJpYXQiOjE2NTYxMzYyMTl9.dmyWwtQu9GLdS7ClSLxcXgQiKxmaG-JPDjQVxRXOpxs',
});

const unloginedDeep = new DeepClient({ apolloClient });

const delay = (time = 1000) => new Promise(res => setTimeout(res, time));

const f = async () => {
  const guest = await unloginedDeep.guest();
  const guestDeep = new DeepClient({ deep: unloginedDeep, ...guest });
  const admin = await guestDeep.login({ linkId: await guestDeep.id('deep', 'admin') });
  const deep = new DeepClient({ deep: guestDeep, ...admin });

  console.log(admin, await guestDeep.id('deep', 'admin'));

  const { data: [{ id: packageId }] } = await deep.insert({
    type_id: await deep.id('@deep-foundation/core', 'Package'),
    string: { data: { value: '@deep-foundation/passport-username-password' } },
    in: { data: {
      type_id: await deep.id('@deep-foundation/core', 'Contain'),
      from_id: await guestDeep.id('deep', 'admin'),
      string: { data: { value: 'passport' } },
    } },
    out: { data: {
      type_id: await deep.id('@deep-foundation/core', 'Join'),
      to_id: await guestDeep.id('deep', 'admin'),
      string: { data: { value: 'passport' } },
    } },
  });

  await deep.insert([
    {
      type_id: await deep.id('@deep-foundation/core', 'Port'),
      number: { data: { value: 4001 } },
      in: { data: [
        {
          type_id: await deep.id('@deep-foundation/core', 'Contain'),
          from_id: packageId,
          string: { data: { value: 'port' } },
        },
        {
          type_id: await deep.id('@deep-foundation/core', 'RouterListening'),
          in: { data: {
            type_id: await deep.id('@deep-foundation/core', 'Contain'),
            from_id: packageId,
            string: { data: { value: 'routerListening' } },
          } },
          from: { data: {
            type_id: await deep.id('@deep-foundation/core', 'Router'),
            in: { data: [
              {
                type_id: await deep.id('@deep-foundation/core', 'Contain'),
                from_id: packageId,
                string: { data: { value: 'router' } },
              },
              {
                type_id: await deep.id('@deep-foundation/core', 'RouterStringUse'),
                string: { data: { value: '/passport' } },
                in: { data: {
                  type_id: await deep.id('@deep-foundation/core', 'Contain'),
                  from_id: packageId,
                  string: { data: { value: 'routerStringUse' } },
                } },
                from: { data: {
                  type_id: await deep.id('@deep-foundation/core', 'Route'),
                  in: { data: {
                    type_id: await deep.id('@deep-foundation/core', 'Contain'),
                    from_id: packageId,
                    string: { data: { value: 'route' } },
                  } },
                  out: { data: {
                    type_id: await deep.id('@deep-foundation/core', 'HandleRoute'),
                    in: { data: {
                      type_id: await deep.id('@deep-foundation/core', 'Contain'),
                      from_id: packageId,
                      string: { data: { value: 'handleRoute' } },
                    } },
                    to: { data: {
                      type_id: await deep.id('@deep-foundation/core', 'Handler'),
                      from_id: await deep.id('@deep-foundation/core', 'dockerSupportsJs'),
                      in: { data: {
                        type_id: await deep.id('@deep-foundation/core', 'Contain'),
                        from_id: packageId,
                        string: { data: { value: 'handler' } },
                      } },
                      to: { data: {
                        type_id: await deep.id('@deep-foundation/core', 'SyncTextFile'),
                        in: { data: {
                          type_id: await deep.id('@deep-foundation/core', 'Contain'),
                          from_id: packageId,
                          string: { data: { value: 'syncTextFile' } },
                        } },
                        string: { data: {
                          value: /*javascript*/`
  async (req, res, next, { deep, require, gql }) => {
    const id = req?.query?.id;
    if (!id) res.send({ error: '!id' });

    var path = require('path');
    var express = require('express');
    var passport = require('passport');
    var LocalStrategy = require('passport-local');
    var session = require('express-session');
    var crypto = require('crypto');

    const set = async (linkId) => {
      console.log('set', linkId);
      await deep.apolloClient.query({
        query: gql\`query SET($id: String!, $linkId: Int) { authorization { set(input: { id: $id, linkId: $linkId }) { error } } }\`,
        variables: { id, linkId },
      });
    };

    const setError = async (error) => {
      console.log('setError', error);
      await deep.apolloClient.query({
        query: gql\`query SET($id: String!, $error: String) { authorization { set(input: { id: $id, error: $error }) { error } } }\`,
        variables: { id, error },
      });
    };

    const router = express.Router();
    router.use(session({
      secret: 'keyboard cat',
      resave: false,
      saveUninitialized: false,
    }));
    router.use(passport.initialize());
    router.use(passport.session());
    router.use(passport.authenticate('session'));
    passport.serializeUser(function(user, cb) {
      process.nextTick(function() {
        console.log('serializeUser', user);
        cb(null, { id: user.id });
      });
    });
    passport.deserializeUser(function(user, cb) {
      process.nextTick(function() {
        console.log('deserializeUser', user);
        return cb(null, user);
      });
    });
    passport.use(new LocalStrategy(async function verify(username, password, cb) {
      crypto.pbkdf2(password, 'salt', 310000, 32, 'sha256', async function(err, hashedPassword) {
        if (err) {
          // if error, return error
          await setError(String(err));
          cb(err, null);
          return;
        }
        // try to found exists username
        const { data: usernames } = await deep.select({
          type_id: await deep.id('@deep-foundation/passport-username-password', 'Username'),
          string: { value: { _eq: username } },
        });
        console.log({ usernames, username, password, id, linkId, hashedPassword });
        if (usernames.length) {
          // if username found
          const usernameId = usernames[0].id;
          const { data: passwords } = await deep.select({
            type_id: await deep.id('@deep-foundation/passport-username-password', 'Password'),
            from_id: usernameId,
          });
          if (!passwords.length) {
            // if password not found
            await setError('!password');
            cb('!password', null);
            return;
          }
          const foundedPassword = passwords[0]?.value?.value;
          if (foundedPassword != hashedPassword.toString()) {
            // if password incorrect
            await setError('incorrect');
            cb('incorrect', null);
            return;
          }
          // if password correct
          await set(usernameId);
          cb(null, usernameId);
          return;
        } else {
          // if username not found, create new username
          const { data: [{ id: usernameId }] } = await deep.insert({
            type_id: await deep.id('@deep-foundation/passport-username-password', 'Username'),
            string: { data: { value: username } },
          });
          console.log({ usernameId });
          // and create new password
          const { data: [{ id: passwordId }] } = await deep.insert({
            type_id: await deep.id('@deep-foundation/passport-username-password', 'Password'),
            string: { data: { value:    .toString() } },
            from_id: usernameId,
            to_id: usernameId,
          });
          console.log({ passwordId });
          // and set authorization
          await set(usernameId);
          cb(null, usernameId);
          return;
        }
      });
    }));
    router.use('*', passport.authenticate('local', {
      // successRedirect: '/',
      // failureRedirect: '/login'
    }));
    router.handle(req, res, () => {
      res.send(JSON.stringify({}));
    });
  }
                          `,
                        } },
                      } },
                    } },
                  } },
                } },
              }
            ] },
          } },
        },
      ] },
    },
    {
      type_id: await deep.id('@deep-foundation/core', 'Type'),
      in: { data: {
        type_id: await deep.id('@deep-foundation/core', 'Contain'),
        from_id: packageId,
        string: { data: { value: 'Username' } },
      } },
      out: { data: {
        type_id: await deep.id('@deep-foundation/core', 'Value'),
        to_id: await deep.id('@deep-foundation/core', 'String'),
      } },
    },
    {
      type_id: await deep.id('@deep-foundation/core', 'Type'),
      from_id: await deep.id('@deep-foundation/core', 'Any'),
      to_id: await deep.id('@deep-foundation/core', 'Any'),
      in: { data: {
        type_id: await deep.id('@deep-foundation/core', 'Contain'),
        from_id: packageId,
        string: { data: { value: 'Password' } },
      } },
      out: { data: {
        type_id: await deep.id('@deep-foundation/core', 'Value'),
        to_id: await deep.id('@deep-foundation/core', 'String'),
      } },
    },
  ]);
  await deep.insert({
    type_id: await deep.id('@deep-foundation/core', 'Rule'),
    out: { data: [
      {
        type_id: await deep.id('@deep-foundation/core', 'RuleSubject'),
        to: { data: {
          type_id: await deep.id('@deep-foundation/core', 'Selector'),
          out: { data: [
            {
              type_id: await deep.id('@deep-foundation/core', 'SelectorInclude'),
              to_id: await deep.id('@deep-foundation/passport-username-password', 'Username'),
              out: { data: {
                type_id: await deep.id('@deep-foundation/core', 'SelectorTree'),
                to_id: await deep.id('@deep-foundation/core', 'joinTree'),
              }, },
            },
          ] },
        }, },
      },
      {
        type_id: await deep.id('@deep-foundation/core', 'RuleObject'),
        to: { data: {
          type_id: await deep.id('@deep-foundation/core', 'Selector'),
          out: { data: [
            {
              type_id: await deep.id('@deep-foundation/core', 'SelectorInclude'),
              to_id: await deep.id('@deep-foundation/passport-username-password', 'Username'),
              out: { data: {
                type_id: await deep.id('@deep-foundation/core', 'SelectorTree'),
                to_id: await deep.id('@deep-foundation/core', 'containTree'),
              }, },
            },
            {
              type_id: await deep.id('@deep-foundation/core', 'SelectorInclude'),
              to_id: await deep.id('@deep-foundation/passport-username-password', 'Password'),
              out: { data: {
                type_id: await deep.id('@deep-foundation/core', 'SelectorTree'),
                to_id: await deep.id('@deep-foundation/core', 'containTree'),
              }, },
            },
          ], },
        }, },
      },
      {
        type_id: await deep.id('@deep-foundation/core', 'RuleAction'),
        to: { data: {
          type_id: await deep.id('@deep-foundation/core', 'Selector'),
          out: { data: [
            {
              type_id: await deep.id('@deep-foundation/core', 'SelectorInclude'),
              to_id: await deep.id('@deep-foundation/core', 'AllowSelectType'),
              out: { data: {
                type_id: await deep.id('@deep-foundation/core', 'SelectorTree'),
                to_id: await deep.id('@deep-foundation/core', 'containTree'),
              }, },
            },
            {
              type_id: await deep.id('@deep-foundation/core', 'SelectorInclude'),
              to_id: await deep.id('@deep-foundation/core', 'AllowInsertType'),
              out: { data: {
                type_id: await deep.id('@deep-foundation/core', 'SelectorTree'),
                to_id: await deep.id('@deep-foundation/core', 'containTree'),
              }, },
            },
          ], },
        }, },
      },
    ], },
  });
};
f();