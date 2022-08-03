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

  const User = await deep.id('@deep-foundation/core', 'User');
  const Type = await deep.id('@deep-foundation/core', 'Type');
  const Any = await deep.id('@deep-foundation/core', 'Any');
  const Join = await deep.id('@deep-foundation/core', 'Join');
  const Contain = await deep.id('@deep-foundation/core', 'Contain');
  const Value = await deep.id('@deep-foundation/core', 'Value');
  const String = await deep.id('@deep-foundation/core', 'String');
  const Package = await deep.id('@deep-foundation/core', 'Package');

  const SyncTextFile = await deep.id('@deep-foundation/core', 'SyncTextFile');
  const dockerSupportsJs = await deep.id('@deep-foundation/core', 'dockerSupportsJs');
  const Handler = await deep.id('@deep-foundation/core', 'Handler');
  const HandleInsert = await deep.id('@deep-foundation/core', 'HandleInsert');
  const HandleDelete = await deep.id('@deep-foundation/core', 'HandleDelete');

  const Tree = await deep.id('@deep-foundation/core', 'Tree');
  const TreeIncludeNode = await deep.id('@deep-foundation/core', 'TreeIncludeNode');
  const TreeIncludeUp = await deep.id('@deep-foundation/core', 'TreeIncludeUp');
  const TreeIncludeFromCurrent = await deep.id('@deep-foundation/core', 'TreeIncludeFromCurrent');

  const Rule = await deep.id('@deep-foundation/core', 'Rule');
  const RuleSubject = await deep.id('@deep-foundation/core', 'RuleSubject');
  const RuleObject = await deep.id('@deep-foundation/core', 'RuleObject');
  const RuleAction = await deep.id('@deep-foundation/core', 'RuleAction');
  const Selector = await deep.id('@deep-foundation/core', 'Selector');
  const SelectorInclude = await deep.id('@deep-foundation/core', 'SelectorInclude');
  const SelectorExclude = await deep.id('@deep-foundation/core', 'SelectorExclude');
  const SelectorTree = await deep.id('@deep-foundation/core', 'SelectorTree');
  const containTree = await deep.id('@deep-foundation/core', 'containTree');
  const AllowInsertType = await deep.id('@deep-foundation/core', 'AllowInsertType');
  const AllowDeleteType = await deep.id('@deep-foundation/core', 'AllowDeleteType');
  const SelectorFilter = await deep.id('@deep-foundation/core', 'SelectorFilter');
  const Query = await deep.id('@deep-foundation/core', 'Query');
  const usersId = await deep.id('deep', 'users');

  console.log({
    Type,
    Any,
    Join,
    Contain,
    Value,
    String,
    Package,
    SyncTextFile,
    dockerSupportsJs,
    Handler,
  HandleInsert,
  });

  const { data: [{ id: packageId }] } = await deep.insert({
    type_id: Package,
    string: { data: { value: `@deep-foundation/messaging` } },
    in: { data: [
      {
        type_id: Contain,
        from_id: deep.linkId
      },
    ] },
    out: { data: [
      {
        type_id: Join,
        to_id: await deep.id('deep', 'users', 'packages'),
      },
      {
        type_id: Join,
        to_id: await deep.id('deep', 'admin'),
      },
    ] },
  });

  console.log({ packageId });

  const { data: [{ id: MReply }] } = await deep.insert({
    type_id: Type,
    from_id: Any,
    to_id: Any,
    in: { data: {
      type_id: Contain,
      from_id: packageId,
      string: { data: { value: 'Reply' } },
    } },
  });

  console.log({ Reply: MReply });

  const { data: [{ id: MMessage }] } = await deep.insert({
    type_id: Type,
    in: { data: {
      type_id: Contain,
      from_id: packageId,
      string: { data: { value: 'Message' } },
    } },
    out: { data: {
      type_id: Value,
      to_id: String,
    } },
  });

  console.log({ Message: MMessage });

  const { data: [{ id: MAuthor }] } = await deep.insert({
    type_id: Type,
    from_id: Any,
    to_id: Any,
    in: { data: {
      type_id: Contain,
      from_id: packageId, // before created package
      string: { data: { value: 'Author' } },
    } },
  });

  console.log({ Author: MAuthor });

  const { data: [{ id: MJoin }] } = await deep.insert({
    type_id: Type,
    from_id: Any,
    to_id: Any,
    in: { data: {
      type_id: Contain,
      from_id: packageId, // before created package
      string: { data: { value: 'Join' } },
    } },
  });

  const { data: [{ id: MJoinRule }] } = await deep.insert({
    type_id: Type,
    from_id: MJoin,
    to_id: Rule,
    in: { data: {
      type_id: Contain,
      from_id: packageId,
      string: { data: { value: 'JoinRule' } },
    } },
  });

  console.log({ JoinRule: MJoinRule });

  console.log({ Join: MJoin });

  const { data: [{ id: insertHandlerId }] } = await deep.insert({
    type_id: SyncTextFile,
    in: { data: [{
      type_id: Contain,
      from_id: packageId, // before created package
      string: { data: { value: 'joinInsertHandlerFile' } },
    }, {
      from_id: dockerSupportsJs,
      type_id: Handler,
      in: { data: [{
        type_id: Contain,
        from_id: packageId, // before created package
        string: { data: { value: 'joinInsertHandler' } },
      }, {
        type_id: HandleInsert,
        from_id: MJoin,
        in: { data: [{
          type_id: Contain,
          from_id: packageId, // before created package
          string: { data: { value: 'joinInsertHandle' } },
        }] },
      }] },
    }] },
    string: { data: { value: `async ({ deep, data: { newLink } }) => {
      const permission = await deep.insert({
        type_id: await deep.id('@deep-foundation/core', 'Rule'),
        in: { data: [{
          type_id: await deep.id('@deep-foundation/messaging', 'JoinRule'),
          from_id: newLink.id,
        }] },
        out: { data: [
          {
            type_id: await deep.id('@deep-foundation/core', 'RuleSubject'),
            to: { data: {
              type_id: await deep.id('@deep-foundation/core', 'Selector'),
              out: { data: [
                {
                  type_id: await deep.id('@deep-foundation/core', 'SelectorInclude'),
                  to_id: newLink.to_id,
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
                  to_id: newLink.from_id,
                  out: { data: {
                    type_id: await deep.id('@deep-foundation/core', 'SelectorTree'),
                    to_id: await deep.id('@deep-foundation/messaging', 'messagingTree'),
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
                  to_id: await deep.id('@deep-foundation/core', 'AllowSelect'),
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
      return permission;
    }` } },
  });

  console.log({ insertHandlerId });

  const { data: [{ id: deleteHandlerId }] } = await deep.insert({
    type_id: SyncTextFile,
    in: { data: [{
      type_id: Contain,
      from_id: packageId, // before created package
      string: { data: { value: 'joinDeleteHandlerFile' } },
    }, {
      from_id: dockerSupportsJs,
      type_id: Handler,
      in: { data: [{
        type_id: Contain,
        from_id: packageId, // before created package
        string: { data: { value: 'joinDeleteHandler' } },
      }, {
        type_id: HandleDelete,
        from_id: MJoin,
        in: { data: [{
          type_id: Contain,
          from_id: packageId, // before created package
          string: { data: { value: 'joinDeleteHandle' } },
        }] },
      }] },
    }] },
    string: { data: { value: `async ({ deep, data: { oldLink } }) => {
      const permission = await deep.delete({
        type_id: await deep.id('@deep-foundation/core', 'Rule'),
        in: {
          type_id: await deep.id('@deep-foundation/messaging', 'JoinRule'),
          from_id: oldLink.id,
        },
      });
      return permission;
    }` } },
  });

  console.log({ deleteHandlerId });

  const { data: [{ id: messagingTree }] } = await deep.insert({
    type_id: Tree,
    in: { data: {
      type_id: Contain,
      from_id: packageId,
      string: { data: { value: 'messagingTree' } },
    } },
    out: { data: [
      {
        type_id: TreeIncludeNode,
        to_id: User,
      },
      {
        type_id: TreeIncludeNode,
        to_id: MMessage,
      },
      {
        type_id: TreeIncludeUp,
        to_id: MReply,
      },
      {
        type_id: TreeIncludeUp,
        to_id: MAuthor,
      },
      {
        type_id: TreeIncludeFromCurrent,
        to_id: MJoin,
      },
    ] },
  });

  console.log({ messagingTree });

  const { data: [{ id: messageId1 }] } = await deep.insert({
    type_id: MMessage,
    string: { data: { value: 'first message' } },
    out: { data: {
      type_id: MReply,
      to_id: deep.linkId,
      out: { data: {
        type_id: MJoin,
        to_id: deep.linkId,
      } }
    } },
  });

  console.log({ messageId1 });

  const replyInsertPermission = await deep.insert({
    type_id: Rule,
    out: { data: [
      {
        type_id: RuleSubject,
        to: { data: {
          type_id: Selector,
          out: { data: [
            {
              type_id: SelectorInclude,
              to_id: usersId,
              out: { data: {
                type_id: SelectorTree,
                to_id: await deep.id('@deep-foundation/core', 'joinTree'),
              }, },
            },
          ] },
        }, },
      },
      {
        type_id: RuleObject,
        to: { data: {
          type_id: Selector,
          out: { data: [
            {
              type_id: SelectorInclude,
              to_id: MReply,
              out: { data: {
                type_id: SelectorTree,
                to_id: containTree,
              }, },
            },
            {
              type_id: SelectorFilter,
              to: { data: {
                type_id: Query,
                object: { data: { value: {
                  _or: [
                    { to: {
                      _by_item: { path_item_id: { _eq: 'X-Deep-User-Id' }, group_id: { _eq: messagingTree }, },
                    } },
                    { from: {
                      _by_item: { path_item_id: { _eq: 'X-Deep-User-Id' }, group_id: { _eq: messagingTree }, },
                    } },
                  ],
                } } }
              } },
            },
          ], },
        }, },
      },
      {
        type_id: RuleAction,
        to: { data: {
          type_id: Selector,
          out: { data: [
            {
              type_id: SelectorInclude,
              to_id: AllowInsertType,
              out: { data: {
                type_id: SelectorTree,
                to_id: containTree,
              }, },
            },
          ], },
        }, },
      },
    ], },
  });

  console.log('replyInsertPermission', replyInsertPermission);

  const messagePermission = await deep.insert({
    type_id: Rule,
    out: { data: [
      {
        type_id: RuleSubject,
        to: { data: {
          type_id: Selector,
          out: { data: [
            {
              type_id: SelectorInclude,
              to_id: usersId,
              out: { data: {
                type_id: SelectorTree,
                to_id: await deep.id('@deep-foundation/core', 'joinTree'),
              }, },
            },
          ] },
        }, },
      },
      {
        type_id: RuleObject,
        to: { data: {
          type_id: Selector,
          out: { data: [
            {
              type_id: SelectorInclude,
              to_id: MMessage,
              out: { data: {
                type_id: SelectorTree,
                to_id: containTree,
              }, },
            },
          ], },
        }, },
      },
      {
        type_id: RuleAction,
        to: { data: {
          type_id: Selector,
          out: { data: [
            {
              type_id: SelectorInclude,
              to_id: AllowInsertType,
              out: { data: {
                type_id: SelectorTree,
                to_id: containTree,
              }, },
            },
          ], },
        }, },
      },
    ], },
  });

  console.log('messagePermission', messagePermission);

  const authorPermission = await deep.insert({
    type_id: Rule,
    out: { data: [
      {
        type_id: RuleSubject,
        to: { data: {
          type_id: Selector,
          out: { data: [
            {
              type_id: SelectorInclude,
              to_id: usersId,
              out: { data: {
                type_id: SelectorTree,
                to_id: await deep.id('@deep-foundation/core', 'joinTree'),
              }, },
            },
          ] },
        }, },
      },
      {
        type_id: RuleObject,
        to: { data: {
          type_id: Selector,
          out: { data: [
            {
              type_id: SelectorInclude,
              to_id: MAuthor,
              out: { data: {
                type_id: SelectorTree,
                to_id: containTree,
              }, },
            },
            {
              type_id: SelectorFilter,
              to: { data: {
                type_id: Query,
                object: { data: { value: {
                  to_id: { _eq: 'X-Deep-User-Id' },
                  // AND ONLY ONE AUTHOR LINK
                } } }
              } },
            },
          ], },
        }, },
      },
      {
        type_id: RuleAction,
        to: { data: {
          type_id: Selector,
          out: { data: [
            {
              type_id: SelectorInclude,
              to_id: AllowInsertType,
              out: { data: {
                type_id: SelectorTree,
                to_id: containTree,
              }, },
            },
          ], },
        }, },
      },
    ], },
  });

  console.log('authorPermission', authorPermission);

  const joinInsertPermission = await deep.insert({
    type_id: Rule,
    out: { data: [
      {
        type_id: RuleSubject,
        to: { data: {
          type_id: Selector,
          out: { data: [
            {
              type_id: SelectorInclude,
              to_id: usersId,
              out: { data: {
                type_id: SelectorTree,
                to_id: await deep.id('@deep-foundation/core', 'joinTree'),
              }, },
            },
          ] },
        }, },
      },
      {
        type_id: RuleObject,
        to: { data: {
          type_id: Selector,
          out: { data: [
            {
              type_id: SelectorInclude,
              to_id: MJoin,
              out: { data: {
                type_id: SelectorTree,
                to_id: containTree,
              }, },
            },
            {
              type_id: SelectorFilter,
              to: { data: {
                type_id: Query,
                object: { data: { value: {
                  from: {
                    _by_item: { path_item_id: { _eq: 'X-Deep-User-Id' }, group_id: { _eq: messagingTree }, },
                  }
                  // AND ONLY ONE AUTHOR LINK
                } } }
              } },
            },
          ], },
        }, },
      },
      {
        type_id: RuleAction,
        to: { data: {
          type_id: Selector,
          out: { data: [
            {
              type_id: SelectorInclude,
              to_id: AllowInsertType,
              out: { data: {
                type_id: SelectorTree,
                to_id: containTree,
              }, },
            },
          ], },
        }, },
      },
    ], },
  });

  console.log('joinInsertPermission', joinInsertPermission);

  const joinDeletePermission = await deep.insert({
    type_id: Rule,
    out: { data: [
      {
        type_id: RuleSubject,
        to: { data: {
          type_id: Selector,
          out: { data: [
            {
              type_id: SelectorInclude,
              to_id: usersId,
              out: { data: {
                type_id: SelectorTree,
                to_id: await deep.id('@deep-foundation/core', 'joinTree'),
              }, },
            },
          ] },
        }, },
      },
      {
        type_id: RuleObject,
        to: { data: {
          type_id: Selector,
          out: { data: [
            {
              type_id: SelectorInclude,
              to_id: MJoin,
              out: { data: {
                type_id: SelectorTree,
                to_id: containTree,
              }, },
            },
            {
              type_id: SelectorFilter,
              to: { data: {
                type_id: Query,
                object: { data: { value: {
                  from: {
                    _by_item: { path_item_id: { _eq: 'X-Deep-User-Id' }, group_id: { _eq: messagingTree }, },
                  }
                  // AND ONLY ONE AUTHOR LINK
                } } }
              } },
            },
          ], },
        }, },
      },
      {
        type_id: RuleAction,
        to: { data: {
          type_id: Selector,
          out: { data: [
            {
              type_id: SelectorInclude,
              to_id: AllowDeleteType,
              out: { data: {
                type_id: SelectorTree,
                to_id: containTree,
              }, },
            },
          ], },
        }, },
      },
    ], },
  });

  console.log('joinDeletePermission', joinDeletePermission);
};
f();