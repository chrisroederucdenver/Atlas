define(['knockout', 'lscache', 'services/job/jobDetail', 'assets/ohdsi.util', 'const'], function (ko, cache, jobDetail, ohdsiUtil, constants) {
	var state = {};
	state.resultsUrl = ko.observable();
	state.vocabularyUrl = ko.observable();
	state.evidenceUrl = ko.observable();
	state.jobListing = ko.observableArray();
	state.priorityScope = ko.observable('session');
	state.roles = ko.observableArray();
	state.users = ko.observableArray();
	state.sources = ko.observableArray([]);
	state.currentView = ko.observable('loading');
	state.loading = ko.observable(false);

	state.sourceKeyOfVocabUrl = ko.computed(() => {
		return state.vocabularyUrl() ? state.vocabularyUrl().replace(/\/$/, '').split('/').pop() : null;
	});

	// shared concept selection state
	state.selectedConceptsIndex = {};
	state.selectedConcepts = ko.observableArray(null);
	state.conceptSetExpression = ko.pureComputed(() => {
		return { "items": state.selectedConcepts() };
	});
	state.appInitializationStatus = ko.observable(constants.applicationStatuses.initializing);

	state.clearSelectedConcepts = function ({ source } = {}) {
		conceptSetKey = `${source}ConceptSet`;
		this[conceptSetKey].selectedConceptsIndex = {};
		this[conceptSetKey].selectedConcepts([]);
	}

	state.IRAnalysis = {
		current: ko.observable(null),
		selectedId: ko.observable(null)
	}
	state.IRAnalysis.dirtyFlag = ko.observable(new ohdsiUtil.dirtyFlag(state.IRAnalysis.current()));

	//Cohort characterizations
	state.CohortCharacterization = {
		current: ko.observable(null),
		selectedId: ko.observable(null),
	};
	state.CohortCharacterization.dirtyFlag = ko.observable(new ohdsiUtil.dirtyFlag(state.CohortCharacterization.current()));

	state.FeatureAnalysis = {
		current: ko.observable(null),
		selectedId: ko.observable(null),
	};
	state.FeatureAnalysis.current.subscribe(newValue => {
		if (newValue != null) {
			state.FeatureAnalysis.dirtyFlag(new ohdsiUtil.dirtyFlag(state.FeatureAnalysis.current()));
		}
	});
	state.FeatureAnalysis.dirtyFlag = ko.observable(new ohdsiUtil.dirtyFlag(state.FeatureAnalysis.current()));

	// Pathways State
	state.CohortPathways = {
		current: ko.observable(null),
		selectedId: ko.observable(null)
	};
	state.CohortPathways.dirtyFlag = ko.observable(new ohdsiUtil.dirtyFlag(state.CohortPathways.current()));


	state.estimationAnalysis = {
		current: ko.observable(null),
		analysisPath: null,
		selectedId: ko.observable(null),
		comparisons: ko.observableArray(),
	}
	state.estimationAnalysis.dirtyFlag = ko.observable(new ohdsiUtil.dirtyFlag(state.estimationAnalysis.current()));

	state.predictionAnalysis = {
		current: ko.observable(null),
		analysisPath: null,
		selectedId: ko.observable(null),
		targetCohorts: ko.observableArray(),
		outcomeCohorts: ko.observableArray(),
	}
	state.predictionAnalysis.dirtyFlag = ko.observable(new ohdsiUtil.dirtyFlag(state.predictionAnalysis.current()));

	state.ConfigurationSource = {
		current: ko.observable(null),
		selectedId: ko.observable(null),
	}
	state.ConfigurationSource.dirtyFlag = ko.observable(new ohdsiUtil.dirtyFlag(state.ConfigurationSource.current()));


	state.criteriaContext = ko.observable();

	state.includedConcepts = ko.observableArray([]);
	state.currentIncludedConceptIdentifierList = ko.observable();
	state.conceptSetInclusionIdentifiers = ko.observableArray([]);

	state.loadingSourcecodes = ko.observable(false);
	state.loadingIncluded = ko.observable(false);
	state.includedConceptsMap = ko.observable({});
	state.includedSourcecodes = ko.observableArray();
	state.currentConceptSetMode = ko.observable('details');
	state.includedHash = ko.observable();

	state.ConceptSet = {
		current: ko.observable(),
		source: ko.observable(),
		negativeControls: ko.observable(),
	};
	state.ConceptSet.dirtyFlag = ko.observable(new ohdsiUtil.dirtyFlag({
		header: state.ConceptSet.current,
		details: state.selectedConcepts,
	}));
	state.ConceptSet.current.subscribe((newValue) => {
		console.log('---nW', newValue);
		if (newValue != null) {
			state.ConceptSet.dirtyFlag(new ohdsiUtil.dirtyFlag({
				header: state.ConceptSet.current,
				details: state.selectedConcepts,
			}));
		}
	});

	state.currentConceptIdentifierList = ko.observable();
	state.resolvingConceptSetExpression = ko.observable(false);
	state.currentConceptSetExpressionJson = ko.observable();

	state.CohortDefinition = {
		current: ko.observable(null),
		info: ko.observable(),
		mode: ko.observable('definition'),
		sourceInfo: ko.observableArray(),
		lastUpdatedId: ko.observable(),
	};
	state.CohortDefinition.dirtyFlag = ko.observable(new ohdsiUtil.dirtyFlag(state.CohortDefinition.current()));
	state.CohortDefinition.current.subscribe(newValue => {
		if (newValue != null) {
			state.CohortDefinition.dirtyFlag(new ohdsiUtil.dirtyFlag(state.CohortDefinition.current()));
		}
	});
	state.cohortDefinitions = ko.observableArray();

	state.activeConceptSets = ko.observable({});
	state.vocabularyActiveConceptSet = ko.observable();

	state.activeConceptSetSource = ko.observable();

	ko.subscribable.fn.subscribeChanged = function (callback, context) {
		var savedValue = this.peek();
		return this.subscribe(function (latestValue) {
			var oldValue = savedValue;
			savedValue = latestValue;
			callback.call(context, latestValue, oldValue);
		});
	};
	

	state.activeConceptSetSource.subscribeChanged((newValue, oldValue) => {
		console.log('state.activeConceptSetSource.subscribeChanged',newValue, oldValue);
	// 	if (!newValue) return;
		const concept = state.HashedConceptSets[state.activeConceptSetSource()];
		console.log(concept);
	// 	if (!!concept) {
	// 		state.ConceptSet.current = ko.observable();
	// 		state.clearSelectedConcepts();
	// 		console.log('HAS HASHED CONCEPT', concept.selectedConcepts)
	// 		const { 
	// 			includedConcepts,
	// 			includedSourcecodes,
	// 			currentConceptIdentifierList,
	// 			currentIncludedConceptIdentifierList,
	// 			selectedConcepts,
	// 			conceptSetName,
	// 			conceptSetId,
	// 		 } = concept;
	// 		state.includedConcepts(includedConcepts);
	// 		state.includedSourcecodes(includedSourcecodes);
	// 		state.currentConceptIdentifierList(currentConceptIdentifierList);
	// 		state.currentIncludedConceptIdentifierList(currentIncludedConceptIdentifierList);
	// 		state.selectedConcepts(selectedConcepts);
	// 		state.ConceptSet.current({
	// 			id: conceptSetId,
	// 			name: ko.observable(conceptSetName),
	// 		})
	// 	} else {
	// 		state.HashedConceptSets[state.activeConceptSetSource()] = {
	// 			includedConcepts: state.includedConcepts(),
	// 			includedSourcecodes: state.includedSourcecodes(),
	// 			currentConceptIdentifierList: state.currentConceptIdentifierList(),
	// 			currentIncludedConceptIdentifierList: state.currentIncludedConceptIdentifierList(),
	// 			selectedConcepts: state.selectedConcepts(),
	// 		}
	// 	}
	});

	state.HashedConceptSets = {};


	state.cohortDefinitionConceptSet = {
		current: ko.observable(),
		selectedConcepts: ko.observableArray([]),
	};

	// state.repositoryConceptSet = {
	// 	current: ko.observable(),
	// 	negativeControls: ko.observable(),
	// 	selectedConcepts: ko.observableArray([]),
	// 	selectedConceptsIndex: {},
	// 	includedConcepts: ko.observableArray([]),
	// 	includedConceptsMap: ko.observable({}),
	// 	includedSourcecodes: ko.observableArray([]),
	// 	conceptSetInclusionIdentifiers: ko.observableArray([]),
	// 	currentConceptIdentifierList: ko.observable(),
	// 	currentIncludedConceptIdentifierList: ko.observable(),
	// 	currentConceptSetExpressionJson: ko.observable(),
	// 	includedHash: ko.observable(),
	// 	resolvingConceptSetExpression: ko.observable(false),
	// 	loadingSourcecodes: ko.observable(false),
	// 	loadingIncluded: ko.observable(false),
	// }

	// Define ConceptSetStore for each module with conceptSet tab
	Object.keys(constants.conceptSetSources).forEach(k => {
		const conceptSetStoreKey = `${k}ConceptSet`
		state[conceptSetStoreKey] = {
			current: ko.observable(),
			negativeControls: ko.observable(),
			selectedConcepts: ko.observableArray([]),
			selectedConceptsIndex: {},
			includedConcepts: ko.observableArray([]),
			includedConceptsMap: ko.observable({}),
			includedSourcecodes: ko.observableArray([]),
			conceptSetInclusionIdentifiers: ko.observableArray([]),
			currentConceptIdentifierList: ko.observable(),
			currentIncludedConceptIdentifierList: ko.observable(),
			currentConceptSetExpressionJson: ko.observable(),
			includedHash: ko.observable(),
			resolvingConceptSetExpression: ko.observable(false),
			loadingSourcecodes: ko.observable(false),
			loadingIncluded: ko.observable(false),
			source: k,
		};

		state[conceptSetStoreKey].dirtyFlag = ko.observable(new ohdsiUtil.dirtyFlag({
			header: state[conceptSetStoreKey].current,
			details: state[conceptSetStoreKey].selectedConcepts,
		}));

		state[conceptSetStoreKey].current.subscribe((newValue) => {
			if (newValue != null) {
				state[conceptSetStoreKey].dirtyFlag(new ohdsiUtil.dirtyFlag({
					header: state[conceptSetStoreKey].current,
					details: state[conceptSetStoreKey].selectedConcepts,
				}));
			}
		});
	});

	state.activeConceptSets = ko.pureComputed(() => {
		const activeConceptSetSources = Object.keys(constants.conceptSetSources).filter(key => !!state[`${key}ConceptSet`].current());
		return activeConceptSetSources.map(source => state[`${source}ConceptSet`]);
	})

	state.activeConceptSet = ko.observable();
	
	return state;
});