// require modules
const express = require('express');
const router = express.Router();
const axios = require('axios');
const services = require('../services');
const scrapper = require('../services/scrapper');
const config = require('../config');
const tunnel = require('tunnel');

// require models
const Conditions = require('../models/Conditions');

// establish proxy tunnel when working behind a proxy server
// comment this block of 'agent' to disable tunnel
const agent = tunnel.httpsOverHttp({
		proxy: {
			host: config.host,
			port: config.port,
			proxyAuth: config.proxyUsername.concat(':').concat(config.proxyPassword),
		}
	});

// API 1 - Get symptoms from ApiMedic
/**
 * @api {get} /symptoms Symptoms
 * @apiName SymptomsAPI
 * @apiGroup API
 * @apiVersion 1.0.0
 * @apiDescription List all symptoms from ApiMedic
 * @apiSuccess {Object[]} Symptoms List of symptoms
 * @apiSuccess {Number} Symptoms.ID Symptom ID
 * @apiSuccess {String} Symptoms.Name Symptom Name
 * @apiSuccessExample {json} Success-Response:
 * 	HTTP/1.1 200 OK
 *	[{
 *			"ID": 10,
 *			"Name": "Abdominal pain"
 *		},
 *		{
 *			"ID": 238,
 *			"Name": "Anxiety"
 *		},
 *		{
 *			"ID": 104,
 *			"Name": "Back pain"
 *		},
 *		{
 *			"ID": 75,
 *			"Name": "Burning eyes"
 *		},
 *		{
 *			"ID": 46,
 *			"Name": "Burning in the throat"
 *	}]
 */
router.get('/symptoms', (req, res, next) => {
	// Get hash generated by services function for user's password
	let hash = services.genHashString();
	// Get authorization token corresponding to user's credentials by ApiMedic auth-service
	services.getToken()
	.then((hashToken) => {
		console.log('[API\t] \tFetching symptoms');
		// Make a HTTP GET request to endpoint = /symptoms on ApiMedic healthservice to get symptoms
		axios({
			method: 'get',
			url: 'https://sandbox-healthservice.priaid.ch/symptoms',
			headers: {
				'Authorization': `Bearer ${config.username}:${hash}`
			},
			// comment 'proxy' & 'httpsAgent' parameters if not working behind a proxy server
			proxy: false,
			httpsAgent: agent,
			params: {
				token: hashToken,
				language: 'en-gb'
			}
		}).then((resp) => {
			console.log('[API\t] \tSymptoms fetched');
			res.json(resp.data);
			res.end();
		}).catch((err) => {
			next(err);
		})
	}).catch((err) => {
		next(err);
	});
});

// API 2 - Get diagnosis/medical condition for a given symptom or set of symptoms
/**
 * @api {post} /diagnosis Diagnosis
 * @apiName DiagnosisAPI
 * @apiGroup API
 * @apiVersion 1.0.0
 * @apiDescription List diagnosis for given symptom(s)
 * @apiParam {Number[]} symptoms Array of Symptom IDs for which to perform diagnosis
 * @apiParam {String="male","female"} gender Gender of the patient
 * @apiParam {Number} year_of_birth Year of Birth of the patient
 * @apiParamExample {json} Request-Example:
 * 	{
 *		"symptoms":"[10,104]",
 *		"gender":"male",
 *		"year_of_birth":1997
 *	}
 * @apiSuccess {Object[]} Conditions List of medical conditions diagnosed as per given details
 * @apiSuccess {Object} Conditions.Issues List of properties of a particular medical condition
 * @apiSuccess {Object[]} Conditions.Specialisation List of Specialisation for a particular medical condition
 * @apiSuccess {Number} Conditions.Issues.ID Issue ID
 * @apiSuccess {String} Conditions.Issues.Name Issue Name
 * @apiSuccess {Number} Conditions.Issues.Accuracy Accuracy of Issue based on symptoms
 * @apiSuccess {String} Conditions.Issues.Icd Issue Icd
 * @apiSuccess {String} Conditions.Issues.IcdName Issue Name of Icd
 * @apiSuccess {String} Conditions.Issues.ProfName Issue Professional Name
 * @apiSuccess {Number} Conditions.Issues.Ranking Ranking of Issue
 * @apiSuccess {Number} Conditions.Specialisation.ID Specialisation ID
 * @apiSuccess {String} Conditions.Specialisation.Name Specialisation Name
 * @apiSuccess {Name} Conditions.Specialisation.SpecialistID ID of specialist for list Specialisation, =0 if unavailable
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * [{
 *		"Issue": {
 *			"ID": 324,
 *			"Name": "Kidney stones",
 *			"Accuracy": 89.99999,
 *			"Icd": "N20",
 * 			"IcdName": "Calculus of kidney and ureter",
 *			"ProfName": "Nephrolith",
 *			"Ranking": 1
 *		},
 *		"Specialisation": [
 *			{
 *				"ID": 15,
 *				"Name": "General practice",
 *				"SpecialistID": 0
 *			},
 *			{
 *				"ID": 42,
 *				"Name": "Urology",
 *				"SpecialistID": 0
 *			}
 *		]
 *	}]
 * @apiErrorExample {text/plain} Error-Response:
 *	HTTP/1.1 500 Internal Server Error
 *	Internal Server Error
 */
router.post('/diagnosis', (req, res, next) => {
	// Get hash generated by services function for user's password
	let hash = services.genHashString();
	console.log('[API\t] \tValidating gender');
	// Check if the body contains the valid gender else send error
	if (req.body.gender == 'male' || req.body.gender == 'female') {
		console.log('[API\t] \tGender valid');
		// Get authorization token corresponding to user's credentials by ApiMedic auth-service
		services.getToken()
		.then((hashToken) => {
			console.log(`[API\t] \tAnalyzing for diagnosis with parameters:
				symptoms: ${req.body.symptoms}
				gender: ${req.body.gender}
				year_of_Birth: ${req.body.year_of_birth}
			`);
			// Make a HTTP GET request to endpoint = /diagnosis on ApiMedic healthservice to get diagnosis/medical condition
			axios({
				method: 'get',
				url: 'https://sandbox-healthservice.priaid.ch/diagnosis',
				headers: {
					'Authorization': `Bearer ${config.username}:${hash}`
				},
				// comment 'proxy' & 'httpsAgent' parameters if not working behind a proxy server
				proxy: false,
				httpsAgent: agent,
				params: {
					token: hashToken,
					language: 'en-gb',
					symptoms: JSON.stringify(req.body.symptoms),
					gender: req.body.gender,
					year_of_birth: req.body.year_of_birth,
				},
			}).then((resp) => {
				console.log('[API\t] \tDiagnosis complete');
				res.json(resp.data);
				res.end();
			}).catch((err) => {
				next(err);
			})
		}).catch((err) => {
			next(err);
		});
	} else {
		console.log('[API\t] \tGender not valid');
		// Send error because gender is not valid
		res.sendStatus(500);
		res.end();
	}
});

// API 3a - Scrap condition data for 'Treatment','Prevention' and 'Specialty' for a given diagnosis/medical condition
// This endpoint is to be called before API 3b
/**
 * @api {get} /diagnosis/condtion ConditionInfo
 * @apiName ConditionInfoAPI
 * @apiGroup API
 * @apiVersion 1.0.0
 * @apiDescription Advises for given diagnosis/medical condition
 * @apiParam {String} condition Name of the Issue/condtion
 * @apiParamExample {json} Request-Example:
 * 	{
 *		"condition":"Pneumonia"
 *	}
 * @apiSuccess {Object} Info List of info about the Issue/condtion as per scrapping function
 * @apiSuccess {String} Info.Condition Given query condition
 * @apiSuccess {String} Info.Treatment Treatment advice for given Issue/condtion
 * @apiSuccess {String} Info.Prevention Prevention advice for given Issue/condition
 * @apiSuccess {String} Info.Specialty Specialty required for given Issue/condition
 * @apiSuccessExample {json} Success-Example:
 * 	HTTP/1.1 200 OK
 * 	{
 *		"Condition": "pneumonia",
 *		"Treatment": null,
 *		"Prevention": "Vaccines, handwashing, not smoking",
 *		"Specialty": "Pulmonology, Infectious disease"
 *	}
 * @apiErrorExample {text/plain} Error-Response:
 * 	HTTP/1.1 400 Bad Request
 * 	Bad Request
 */
router.get('/diagnosis/condition', (req, res, next) => {
	console.log('[API\t] \tValidating query');
	// Check if query is not null
	if ((req.query.condition === null) || (req.query.condition === '')) {
		console.log('[API\t] \tQuery Condtion is not found');
		// Send error because query is empty
		res.sendStatus(400);
		res.end();
	} else {
		console.log('[API\t] \tQuery valid');
		// Convert query string to lowercase to avoid duplicate entries
		let queryCondition = (req.query.condition).toLowerCase().trim();
		console.log('[API\t] \tQuery condition found: ' + queryCondition);
		// Terms for which data is to be scrapped from web
		// To make changes in keys, other part of code is also to be changed accordingly in scrapper.js
		let keys = ['Treatment', 'Prevention', 'Specialty'];
		// Find one document of Conditions model
		Conditions.findOne({condition: queryCondition}).then((doc) => {
			console.log('[Database] \tSearching for data for ' + queryCondition);
			// If no document is found then search/scrap the web
			if (doc === null) {
				console.log('[Database] \tData not found');
				console.log('[API\t] \tSearching for the condition ' + queryCondition + ' on wikipedia');
				// Use scrapping function to return array of info
				scrapper.scrapWiki(queryCondition).then((arr) => {
					// Extract required data from info
				let info = scrapper.extractFromWiki(keys, arr);
				console.log('[API\t] \tAdding data scrapped to database');
				// Create a new database document
					Conditions.create({
						'condition': queryCondition, //unique
						'treatment': info[0],
						'prevention': info[1],
						'specialty': info[2],
					}).then((data) => {
						console.log('[Database] \tData saved');
						console.log('[API\t] \tSearch complete');
						res.json({
							'Condition':data.condition,
							'Treatment':data.treatment,
							'Prevention':data.prevention,
							'Specialty':data.specialty
						});
						res.end();
					}).catch((err) => {
						next(err);
					})
				}).catch((err) => {
					next(err);
				})
			} else {
				console.log('[Database] \tData found');
				console.log('[API\t] \tSearch complete');
				// console.log('Entry found in db');
				// Return document if already in database
				res.json({
					'Condition':doc.condition,
					'Treatment':doc.treatment,
					'Prevention':doc.prevention,
					'Specialty':doc.specialty
				});
				res.end();
			}
		}).catch((err) => {
			next(err)
		})
	}
});

// API 3b - Scrap condition data for 'Medication' for a given diagnosis/medical condition
// This endpoint is to be called after API 3a
/**
 * @api {get} /diagnosis/medication MedicationInfo
 * @apiName MedicationInfoAPI
 * @apiGroup API
 * @apiVersion 1.0.0
 * @apiDescription Advises for given diagnosis/medical condition
 * @apiParam {String} condition Name of the Issue/condtion
 * @apiParamExample {json} Request-Example:
 * 	{
 *		"condition":"Kidney Stones"
 *	}
 * @apiSuccess {Object} Info List of info about the Issue/condtion as per scrapping function
 * @apiSuccess {String} Info.Condition Given query condition
 * @apiSuccess {String} Info.Treatment Treatment advice for given Issue/condtion
 * @apiSuccess {String} Info.Prevention Prevention advice for given Issue/condition
 * @apiSuccess {String} Info.Specialty Specialty required for given Issue/condition
 * @apiSuccess {String} Info.Medication Medication for given Issue/condition
 * @apiSuccessExample {json} Success-Example:
 * 	HTTP/1.1 200 OK
 * 	{
 *		"Condition": "kidney stones",
 *		"Treatment": Pain medication, extracorporeal shock wave lithotripsy, ureteroscopy, percutaneous nephrolithotomy,
 *		"Prevention": "Drinking fluids such that more than two liters of urine are produced per day",
 *		"Specialty": "Urology, nephrology",
 * 		"Medication":"Allopurinol Cellulose Sodium Phosphate Citrates Diuretics, Thiazide Penicillamine Sodium Bicarbonate Tiopronin"
 *	}
 * @apiErrorExample {text/plain} Error-Response:
 * 	HTTP/1.1 400 Bad Request
 * 	Bad Request
 */
router.get('/diagnosis/medication', (req, res) => {
	console.log('[API\t] \tValidating query');
		// Check if query is not null
	if (req.query.condition == null) {
		console.log('[API\t] \tQuery Condtion is not found');
		// Send error because query is empty
		res.sendStatus(400);
		res.end();
	} else {
		console.log('[API\t] \tQuery valid');
		// Convert query string to lowercase to avoid duplicate entries
		let queryCondition = (req.query.condition).toLowerCase().trim();
		console.log('[API\t] \tQuery condition found: ' + queryCondition);
		// Find one document of Conditions model
		Conditions.findOne({condition: queryCondition}).then((doc) => {
			console.log('[Database] \tSearching for require data from API 3a for ' + queryCondition);
			// If no document found then return error
			if (doc === null) {
				console.log('[Database] \tRequired data not found');
				res.json({"Error":"Could not process query, POST /diagnosis/condition before this endpoint"});
				res.end();
			} else {
				console.log('[Database] \tRequired data found');
				console.log('[Database] \tSearching for data for ' + queryCondition);
				if (doc.medication !== null) {
					console.log('[Database] \tData found');
					console.log('[API\t] \tSearch complete');
					// Return document if already in database
					res.json({
						'Condition':doc.condition,
						'Treatment':doc.treatment,
						'Prevention':doc.prevention,
						'Specialty':doc.specialty,
						'Medication':doc.medication
					});
					res.end();
				} else {
					console.log('[Database] \tData not found');
					console.log('[API\t] \tSearching for the condition ' + queryCondition + ' on emedexpert');
					// Use scrapping function to return string of medication
					scrapper.scrapEMed().then((drug) => {
						// Extract required data from info
						let meds = scrapper.extractFromEMed(queryCondition, drug);
						console.log('[API\t] \tAdding data scrapped to database');
						// RegExp to remove unnecessory elements and update document
						doc.medication = meds.replace(/\\n|\d|\n|[[\]]/g, '');
						 // Save the document after updating
						doc.save().then((newDoc) => {
							console.log('[Database] \tData updated');
							console.log('[API\t] \tSearch complete');
							res.json({
								'Condition':newDoc.condition,
								'Treatment':newDoc.treatment,
								'Prevention':newDoc.prevention,
								'Specialty':newDoc.specialty,
								'Medication':newDoc.medication
							});
							res.end();
						}).catch((err) => {
							next(err);
						})

					}).catch((err) => {
						next(err);
					})
				}
			}
		}).catch((err) => {
			next(err);
		})
	}
});

module.exports = router;
