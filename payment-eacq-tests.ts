import { DeepClient } from './packages/deeplinks/imports/client';
import { sleep } from './tinkoff-split/_utils';
import { confirm } from './tinkoff/confirm';
import { puppeteer } from 'puppeteer';
import { uniqid } from 'uniqid';
import { Link } from './packages/deeplinks/imports/minilinks';
import {expeect} from 'chai';

const payInBrowser = async ({ page, browser, url }) => {
	await page.goto(url, { waitUntil: 'networkidle2' });
	await sleep(3000);
	const oldForm = await page.evaluate(() => {
		return !!document.querySelector(
			'input[automation-id="tui-input-card-grouped__card"]'
		);
	});
	if (oldForm) {
		console.log('OLD FORM!!!!!!!');
		// Старая форма используется на тестовом сервере
		const cvc1 = await page.evaluate(() => {
			return !!document.querySelector(
				'button[automation-id="pay-card__submit"]'
			);
		});
		if (cvc1) {
			await page.waitFor('input[automation-id="tui-input-card-grouped__card"]');
			await sleep(300);
			await page.type(
				'input[automation-id="tui-input-card-grouped__card"]',
				process.env.PAYMENT_TEST_CARD_NUMBER_SUCCESS
			); // card number
			await sleep(300);
			await page.keyboard.press('Tab');
			await sleep(300);
			await page.type(
				'input[automation-id="tui-input-card-grouped__expire"]',
				process.env.PAYMENT_TEST_CARD_EXPDATE
			); // expired date
			await sleep(300);
			await page.keyboard.press('Tab');
			await sleep(300);
			await page.type(
				'input[automation-id="tui-input-card-grouped__cvc"]',
				process.env.PAYMENT_TEST_CARD_CVC
			); // CVC code
			await sleep(300);
			await page.click('button[automation-id="pay-card__submit"]'); // submit button
		} else {
			await page.waitFor('input[automation-id="tui-input-card-grouped__card"]');
			await sleep(300);
			await page.type(
				'input[automation-id="tui-input-card-grouped__card"]',
				process.env.PAYMENT_E2C_CARD_NUMBER_SUCCESS
			); // card number
			await sleep(300);
			await page.keyboard.press('Tab');
			await sleep(300);
			await page.type(
				'input[automation-id="tui-input-card-grouped__expire"]',
				process.env.PAYMENT_E2C_CARD_EXPDATE
			); // expired date
			await sleep(300);
			await page.keyboard.press('Tab');
			await sleep(300);
			await page.type(
				'input[automation-id="tui-input-card-grouped__cvc"]',
				process.env.PAYMENT_E2C_CARD_CVC
			); // CVC code
			await sleep(300);
			await page.click('button[automation-id="pay-wallet__submit"]'); // submit button
			await sleep(300);
			await page.waitFor('input[name="password"]');
			const code = prompt('enter code ');
			console.log('code', code);
			await page.type('input[name="password"]', code);
			await sleep(1000);
		}
		// TODO: пока старая форма вызывалась только на тестовой карте, где ввод смс кода не нужен
		await sleep(1000);
	} else {
		console.log('NEW FORM!!!!!!!');
		await page.type('#pan', process.env.PAYMENT_E2C_CARD_NUMBER_SUCCESS); // card number
		await page.type('#expDate', process.env.PAYMENT_E2C_CARD_EXPDATE); // expired date
		await page.type('#card_cvc', process.env.PAYMENT_E2C_CARD_CVC); // CVC code
		await page.click('button[type=submit]'); // submit button
		await page.waitFor('input[name="password"]');
		const code = prompt('enter code ');
		console.log('code', code);
		await page.type('input[name="password"]', code);
		await sleep(3000);
	}
	await browser.close();
};

export async function tests(deep: DeepClient<Link<number>>) {
	// Tests

	// Setup

	const Type = await deep.id('@deep-foundation/core', 'Type');
	const Any = await deep.id('@deep-foundation/core', 'Any');

	const {
		data: [{ id: Product }],
	} = await deep.insert({
		type_id: Type,
		from_id: Any,
		to_id: Any,
	});

	console.log({ Product });

	// Types

	const PPayment = await deep.id(
		'@deep-foundation/payment-individual-entity',
		'Payment'
	);
	const PObject = await deep.id(
		'@deep-foundation/payment-individual-entity',
		'Object'
	);
	const PSum = await deep.id(
		'@deep-foundation/payment-individual-entity',
		'Sum'
	);
	const PPay = await deep.id(
		'@deep-foundation/payment-individual-entity',
		'Pay'
	);
	const PUrl = await deep.id(
		'@deep-foundation/payment-individual-entity',
		'Url'
	);
	const PPayed = await deep.id(
		'@deep-foundation/payment-individual-entity',
		'Payed'
	);
	const PError = await deep.id(
		'@deep-foundation/payment-individual-entity',
		'Error'
	);

	// Init

	const testInit = async () => {
		const {
			data: [{ id: payment }],
		} = await deep.insert({
			type_id: PPayment,
		});

		const {
			data: [{ id: sum }],
		} = await deep.insert({
			type_id: PSum,
			from_id: deep.linkId,
			to_id: payment,
		});

		console.log({ sum });

		const {
			data: [{ id: product }],
		} = await deep.insert({
			type_id: Product,
		});

		console.log({ product });

		const {
			data: [{ id: object }],
		} = await deep.insert({
			type_id: PObject,
			from_id: payment,
			to_id: product,
		});

		console.log({ object });

		sleep(5000);

		expect(result.error).to.equal(undefined);
	};

	await testInit();

	// Confirm

	const testConfirm = async () => {
		const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
		const page = await browser.newPage();

		await payInBrowser({
			browser,
			page,
			url: initResult.response.PaymentURL,
		});

	await testConfirm();
}
