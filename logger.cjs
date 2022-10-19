require('react');
require('graphql');
require('lodash');
require('subscriptions-transport-ws');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const { generateApolloClient } = require('@deep-foundation/hasura/client');
const { DeepClient } = require('@deep-foundation/deeplinks/imports/client');
const {
	minilinks,
	Link,
} = require('@deep-foundation/deeplinks/imports/minilinks');
const puppeteer = require('puppeteer');
const crypto = require('crypto');
const axios = require('axios');
const uniqid = require('uniqid');
const { expect } = require('chai');
const { get } = require('lodash');
const {
	default: links,
} = require('@deep-foundation/deeplinks/imports/router/links');
const {
	insertHandler,
} = require('@deep-foundation/deeplinks/imports/handlers');

var myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

console.log('Installing payments-tinkoff-c2b package');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const allCreatedLinkIds = [];



const installPackage = async () => {
	const apolloClient = generateApolloClient({
		path: process.env.NEXT_PUBLIC_GQL_PATH || '', // <<= HERE PATH TO UPDATE
		ssl: !!~process.env.NEXT_PUBLIC_GQL_PATH.indexOf('localhost')
			? false
			: true,
		// admin token in prealpha deep secret key
		// token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwczovL2hhc3VyYS5pby9qd3QvY2xhaW1zIjp7IngtaGFzdXJhLWFsbG93ZWQtcm9sZXMiOlsibGluayJdLCJ4LWhhc3VyYS1kZWZhdWx0LXJvbGUiOiJsaW5rIiwieC1oYXN1cmEtdXNlci1pZCI6IjI2MiJ9LCJpYXQiOjE2NTYxMzYyMTl9.dmyWwtQu9GLdS7ClSLxcXgQiKxmaG-JPDjQVxRXOpxs',
	});

	const unloginedDeep = new DeepClient({ apolloClient });
	const guest = await unloginedDeep.guest();
	const guestDeep = new DeepClient({ deep: unloginedDeep, ...guest });
	const admin = await guestDeep.login({
		linkId: await guestDeep.id('deep', 'admin'),
	});
	const deep = new DeepClient({ deep: guestDeep, ...admin });

	const anyTypeId = await deep.id('@deep-foundation/core', 'Any');
	const syncTextFileTypeId = await deep.id('@deep-foundation/core', 'SyncTextFile');
	const plv8SupportsJsId = await deep.id(
		'@deep-foundation/core',
		'plv8SupportsJs'
	  );


	const {
		data: [{ id: LogInsert }],
	} = await deep.insert({
		type_id: Type,
		from_id: Any,
		to_id: Any,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId, // before created package
				string: { data: { value: 'LogInsert' } },
			},
		},
	});
	console.log({ LogInsert });

	const {
		data: [{ id: LogUpdate }],
	} = await deep.insert({
		type_id: Type,
		from_id: Any,
		to_id: Any,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId, // before created package
				string: { data: { value: 'LogUpdate' } },
			},
		},
	});
	console.log({ LogUpdate });

	const {
		data: [{ id: LogDelete }],
	} = await deep.insert({
		type_id: Type,
		from_id: Any,
		to_id: Any,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId, // before created package
				string: { data: { value: 'LogDelete' } },
			},
		},
	});
	console.log({ LogDelete });

	const insertHandler = async ({fileName, handlerName, handleName, triggerTypeId, code, supportsId, handleOperationTypeId}) => {
		const {
			data: [{ id: handlerId }],
		  } = await deep.insert({
			type_id: syncTextFileTypeId,
			in: {
			  data: [
				{
				  type_id: Contain,
				  from_id: packageLinkId, // before created package
				  string: { data: { value: fileName } },
				},
				{
				  from_id: supportsId,
				  type_id: Handler,
				  in: {
					data: [
					  {
						type_id: Contain,
						from_id: packageLinkId, // before created package
						string: { data: { value: handlerName } },
					  },
					  {
						type_id: handleOperationTypeId,
						from_id: triggerTypeId,
						in: {
						  data: [
							{
							  type_id: Contain,
							  from_id: packageLinkId, // before created package
							  string: { data: { value: handleName } },
							},
						  ],
						},
					  },
					],
				  },
				},
			  ],
			},
			string: {
			  data: {
				value: code,
			  },
			},
		  });

		  return handlerId;
	  };




	  const insertHandlerId = await insertHandler(
		{
			code: `({deep, data: {newLink}}) => { 
				const timestamp = Date.now();
				deep.insert({
				   type_id: {_id: ["@deep-foundation/logger", "LogInsert"]},
				   from_id: deep.linkId,
				   to_id: newLink.id,
				   number: {data: {value: timestamp}}
				});
				deep.insert({
					type_id: {_id: ["@deep-foundation/logger", "LogObject"]},
					from_id: newLink.from_id,
					to_id: newLink.to_id,
					out: {
						data: [{
							type_id: {_id: ["@deep-foundation/logger", "LogType"]},
							to_id: newLink.type_id
						}]
					}
				})
			 }`,
			 fileName: "insertHandlerFile",
			 handlerName: "insertHandler",
			 handleName: "insertHandle",
			 handleOperationTypeId: HandleInsert,
			 supportsId: plv8SupportsJsId,
			 triggerTypeId: anyTypeId
		}
	);
	console.log({insertHandlerId});

	const updateHandlerId = await insertHandler(
		{
			code: `({deep, data: {newLink}}) => { 
				const timestamp = Date.now();
	   
				const {data: [{id: logInsertId}]} = await deep.select({
				   type_id: {_id: ["@deep-foundation/logger", "LogInsert"]},
				   to_id: newLink.id
				})
	   
				deep.update({
				   type_id: {_id: ["@deep-foundation/logger", "LogUpdate"]},
				   from_id: deep.linkId,
				   to_id: logInsertId,
				   number: {data: {value: timestamp}}
				})
			 }`,
			 fileName: "updateHandlerFile",
			 handlerName: "updateHandler",
			 handleName: "updateHandle",
			 handleOperationTypeId: HandleUpdate,
			 supportsId: plv8SupportsJsId,
			 triggerTypeId: anyTypeId
		}
	);
	console.log({updateHandlerId});

	const deleteHandlerId = await insertHandler(
		{
			code: `({deep, data: {newLink}}) => { 
				const timestamp = Date.now();
	   
				const {data: [{id: logInsertId}]} = await deep.select({
				   type_id: {_id: ["@deep-foundation/logger", "LogInsert"]},
				   to_id: newLink.id
				})
	   
				deep.delete({
				   type_id: {_id: ["@deep-foundation/logger", "LogDelete"]},
				   from_id: deep.linkId,
				   to_id: logInsertId,
				   number: {data: {value: timestamp}}
				})
			 }`,
			 fileName: "deleteHandlerFile",
			 handlerName: "deleteHandler",
			 handleName: "deleteHandle",
			 handleOperationTypeId: HandleDelete,
			 supportsId: plv8SupportsJsId,
			 triggerTypeId: anyTypeId
		}
	);
	console.log({deleteHandlerId});
};

installPackage();
