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

	const dockerSupportsJs = await deep.id(
		'@deep-foundation/core',
		'dockerSupportsJs'
	);
	const handleInsertTypeId = await deep.id('@deep-foundation/core', 'HandleInsert');
	const handleUpdateTypeId = await deep.id('@deep-foundation/core', 'HandleUpdate');
	const handleDeleteTypeId = await deep.id('@deep-foundation/core', 'HandleDelete');
	const portTypeId = await deep.id('@deep-foundation/core', 'Port');
	const routerListeningTypeId = await deep.id('@deep-foundation/core', 'RouterListening');
	const routerTypeId = await deep.id('@deep-foundation/core', 'Router');
	const routerStringUseTypeId = await deep.id(
		'@deep-foundation/core',
		'RouterStringUse'
	);
	const routeTypeId = await deep.id('@deep-foundation/core', 'Route');
	const handleRouteTypeId = await deep.id(
		'@deep-foundation/core',
		'HandleRoute'
	);
	const handlerTypeId = await deep.id(
		'@deep-foundation/core',
		'Handler'
	);
	const dockerSupportsJsId = await deep.id(
		'@deep-foundation/core',
		'dockerSupportsJs'
	);

	const treeTypeId = await deep.id('@deep-foundation/core', 'Tree');
	const treeIncludeNodeTypeId = await deep.id(
		'@deep-foundation/core',
		'TreeIncludeNode'
	);
	const treeIncludeUpTypeId = await deep.id('@deep-foundation/core', 'TreeIncludeUp');
	const treeIncludeDownTypeId = await deep.id(
		'@deep-foundation/core',
		'TreeIncludeDown'
	);

	const containTypeId = await deep.id('@deep-foundation/core', 'Contain');
	const typeTypeId = await deep.id('@deep-foundation/core', 'Type');
	const packageTypeId = await deep.id('@deep-foundation/core', 'Package');
	const anyTypeId = await deep.id('@deep-foundation/core', 'Any');
	const syncTextFileTypeId = await deep.id('@deep-foundation/core', 'SyncTextFile');
	const joinTypeId = await deep.id('@deep-foundation/core', 'Join');
	const plv8SupportsJsId = await deep.id('@deep-foundation/core','plv8SupportsJs');

	const { data: [{ id: packageId }] } = await deep.insert({
    type_id: packageTypeId,
    string: { data: { value: `@deep-foundation/payments` } },
    in: { data: [
      {
        type_id: containTypeId,
        from_id: deep.linkId
      },
    ] },
    out: { data: [
      {
        type_id: joinTypeId,
        to_id: await deep.id('deep', 'users', 'packages'),
      },
      {
        type_id: joinTypeId,
        to_id: await deep.id('deep', 'admin'),
      },
    ] },
  });
	
  console.log({ packageId });

	const {
		data: [{ id: logInsertTypeId }],
	} = await deep.insert({
		type_id: typeTypeId,
		from_id: anyTypeId,
		to_id: anyTypeId,
		in: {
			data: {
				type_id: containTypeId,
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
				type_id: containTypeId,
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
				type_id: containTypeId,
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
				type_id: containTypeId,
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
				type_id: containTypeId,
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

				const {data: [{logObjectId}]} = deep.insert({
					type_id: {_id: ["@deep-foundation/logger", "LogObject"]},
					from_id: newLink.from_id,
					to_id: newLink.to_id,
					out: {
						data: [{
							type_id: {_id: ["@deep-foundation/logger", "LogType"]},
							to_id: newLink.type_id
						}]
					}
				});

				const {data: [{logInsertId}]} = deep.insert({
					type_id: {_id: ["@deep-foundation/logger", "LogInsert"]},
					from_id: logObjectId,
					to_id: newLink.id,
					number: {data: {value: timestamp}}
			 	});
			 }`,
			fileName: "insertHandlerFile",
			handlerName: "insertHandler",
			handleName: "insertHandle",
			handleOperationTypeId: handleInsertTypeId,
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
	   
				const {data: [{id: logInsertId}]} = deep.select({
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
			handleOperationTypeId: handleUpdateTypeId,
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
	   
				const {data: [{id: logInsertId}]} = deep.select({
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
			handleOperationTypeId: handleDeleteTypeId,
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

	const callTests = async () => {
		const {data: [{id: customTypeId}]} = await deep.insert({
			type_id: typeTypeId,
			from_id: anyTypeId,
			to_id: anyTypeId
		});

		const {data: [{id: linkId}]} = await deep.insert({
			type_id: typeTypeId,
			from_id: anyTypeId,
			to_id: anyTypeId
		});

		var logInsertId;
		for (let i = 0; i < 10; i++) {
			const {data}= await deep.select({
				type_id: logInsertTypeId,
				to_id: linkId
			});
			if(data.length > 0) {
				logInsertId = data[0].id;
				break;
			}
			await sleep(1000);
		}
		expect(logInsertId).to.not.be.equal(undefined);

		var logObjectId;
		for (let i = 0; i < 10; i++) {
			const {data} = await deep.select({
				type_id: logObjectTypeId,
				from_id: linkId.from_id,
				to_id: linkId.to_id
			});
			if(data.length > 0) {
				logObjectId = data[0].id;
				break;
			}
			await sleep(1000);
		}
		expect(logObjectId).to.not.be.equal(undefined);

		var logTypeId;
		for (let i = 0; i < 10; i++) {
			const {data} = await deep.select({
				type_id: logTypeTypeId,
				from_id: logObjectId,
				to_id: customTypeId
			});
			if(data.length > 0) {
				logTypeId = data[0].id;
				break;
			}
			await sleep(1000);
		}
		expect(logTypeId).to.not.be.equal(undefined);

		await deep.insert({link_id: linkId, value: "string"}, {table: "strings"});

		var logUpdateId;
		for (let i = 0; i < 10; i++) {
			const {data} = await deep.select({
				type_id: logUpdateTypeId,
				from_id: deep.linkId,
				to_id: logInsertId
			});
			if(data.length > 0) {
				logUpdateId = data[0].id;
				break;
			}
			await sleep(1000);
		}
		expect(logUpdateId).to.not.be.equal(undefined);

		await deep.delete({
			id: linkId
		});

		var logDeleteId;
		for (let i = 0; i < 10; i++) {
			const {data} = await deep.select({
				type_id: logDeleteTypeId,
				from_id: deep.linkId,
				to_id: logInsertId
			});
			if(data.length > 0) {
				logDeleteId = data[0].id;
				break;
			}
			await sleep(1000);
		}
		expect(logDeleteId).to.not.be.equal(undefined);
	}
	
	await callTests();
};

installPackage();
