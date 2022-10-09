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

	{
		const typeId = await deep.id('@deep-foundation/core', 'Operation');
		const handleInsertTypeId = await deep.id(
			'@deep-foundation/core',
			'HandleInsert'
		);
		const supportsId = await deep.id('@deep-foundation/core', 'plv8SupportsJs');

		await insertHandler(
			handleInsertTypeId,
			typeId,
			`({deep, data: {newLink}}) => { 
         const timestamp = Date.now();
         const logInsertTypeId = deep.id("@deep-foundation/logger", "LogInsert");
         deep.insert({
            type_id: logInsertTypeId,
            from_id: deep.linkId,
            to_id: newLink.id,
            number: {data: {value: timestamp}}
         })
      }`,
			undefined,
			supportsId
		);
	}

	{
		const typeId = await deep.id('@deep-foundation/core', 'Operation');
		const handleUpdateTypeId = await deep.id(
			'@deep-foundation/core',
			'HandleUpdate'
		);
		const supportsId = await deep.id('@deep-foundation/core', 'plv8SupportsJs');

		await insertHandler(
			handleUpdateTypeId,
			typeId,
			`({deep, data: {newLink}}) => { 
         const timestamp = Date.now();

         const logInsertTypeId = await deep.id("@deep-foundation/logger", "LogInsert");
         const {data: [{id: logInsertId}]} = await deep.select({
            type_id: logInsertTypeId,
            to_id: newLink.id
         })

         const logUpdateTypeId = await deep.id("@deep-foundation/logger", "LogUpdate");
         deep.update({
            type_id: logUpdateTypeId,
            from_id: deep.linkId,
            to_id: logInsertId,
            number: {data: {value: timestamp}}
         })
      }`,
			undefined,
			supportsId
		);
	}

	{
		const typeId = await deep.id('@deep-foundation/core', 'Operation');
		const handleDeleteTypeId = await deep.id(
			'@deep-foundation/core',
			'HandleDelete'
		);
		const supportsId = await deep.id('@deep-foundation/core', 'plv8SupportsJs');

		await insertHandler(
			handleDeleteTypeId,
			typeId,
			`({deep, data: {newLink}}) => { 
         const timestamp = Date.now();

         const logInsertTypeId = await deep.id("@deep-foundation/logger", "LogInsert");
         const {data: [{id: logInsertId}]} = await deep.select({
            type_id: logInsertTypeId,
            to_id: newLink.id
         })

         const logDeleteTypeId = await deep.id("@deep-foundation/logger", "LogDelete");
         deep.delete({
            type_id: logDeleteTypeId,
            from_id: deep.linkId,
            to_id: logInsertId,
            number: {data: {value: timestamp}}
         })
      }`,
			undefined,
			supportsId
		);
	}
};

installPackage();
