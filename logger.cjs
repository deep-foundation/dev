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
const {default: links} = require('@deep-foundation/deeplinks/imports/router/links');
const {insertHandler} = require('./deep-packages/insertHandler.cjs');
const {sleep} = require('./deep-packages/sleep.cjs');

var myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

console.log('Installing logger package');


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

	const typeTypeId = await deep.id('@deep-foundation/core', 'Type');
	const anyTypeId = await deep.id('@deep-foundation/core', 'Any');
	const syncTextFileTypeId = await deep.id('@deep-foundation/core', 'SyncTextFile');
	const plv8SupportsJsId = await deep.id(
		'@deep-foundation/core',
		'plv8SupportsJs'
	);


	const {
		data: [{ id: logInsertTypeId }],
	} = await deep.insert({
		type_id: typeTypeId,
		from_id: anyTypeId,
		to_id: anyTypeId,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId, // before created package
				string: { data: { value: 'LogInsert' } },
			},
		},
	});
	console.log({  logInsertTypeId });

	const {
		data: [{ id: logUpdateTypeId }],
	} = await deep.insert({
		type_id: typeTypeId,
		from_id: anyTypeId,
		to_id: anyTypeId,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId, // before created package
				string: { data: { value: 'LogUpdate' } },
			},
		},
	});
	console.log({  logUpdateTypeId });

	const {
		data: [{ id: logDeleteTypeId }],
	} = await deep.insert({
		type_id: typeTypeId,
		from_id: anyTypeId,
		to_id: anyTypeId,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId, // before created package
				string: { data: { value: 'LogDelete' } },
			},
		},
	});
	console.log({  logDeleteTypeId });

	const {
		data: [{ id: logTypeTypeId }],
	} = await deep.insert({
		type_id: typeTypeId,
		from_id: anyTypeId,
		to_id: anyTypeId,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId, // before created package
				string: { data: { value: 'LogType' } },
			},
		},
	});
	console.log({  logTypeTypeId });

	const {
		data: [{ id: logObjectTypeId }],
	} = await deep.insert({
		type_id: typeTypeId,
		from_id: anyTypeId,
		to_id: anyTypeId,
		in: {
			data: {
				type_id: Contain,
				from_id: packageId, // before created package
				string: { data: { value: 'LogObject' } },
			},
		},
	});
	console.log({  logObjectTypeId });

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
			triggerTypeId: anyTypeId,
			containTypeId,
			deep,
			fileTypeId: syncTextFileTypeId,
			handlerTypeId,
			packageId
		}
	);
	console.log({ insertHandlerId });

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
			triggerTypeId: anyTypeId,
			containTypeId,
			deep,
			fileTypeId: syncTextFileTypeId,
			handlerTypeId,
			packageId,
		}
	);
	console.log({ updateHandlerId });

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
			triggerTypeId: anyTypeId,
			containTypeId,
			deep,
			fileTypeId: syncTextFileTypeId,
			handlerTypeId,
			packageId
		}
	);
	console.log({ deleteHandlerId });
};

installPackage();
