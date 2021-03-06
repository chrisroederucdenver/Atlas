define([
	'knockout',
	'appConfig',
	'text!./prediction-executions.html',
	'utils/CommonUtils',
	'utils/AutoBind',
	'utils/DatatableUtils',
	'components/Component',
	'../PermissionService',
	'services/Prediction',
	'services/Source',
	'services/Poll',
	'services/file',
	'services/MomentAPI',
	'utils/ExecutionUtils',
	'../const',
	'const',
	'lodash',
	'services/JobDetailsService',
	'less!./prediction-executions.less',
	'components/modal-exit-message',
], function(
	ko,
	config,
	view,
	commonUtils,
	AutoBind,
	datatableUtils,
	Component,
	PermissionService,
	PredictionService,
	SourceService,
	{PollService},
	FileService,
	momentApi,
	ExecutionUtils,
	consts,
	globalConsts,
	lodash,
	jobDetailsService
){

	class PredictionGeneration extends AutoBind(Component) {

		constructor(params) {
			super(params);

			this.loading = ko.observable();
			this.expandedSection = ko.observable();

			this.analysisId = params.analysisId;
			this.dirtyFlag = params.dirtyFlag;
			this.isViewGenerationsPermitted = this.isViewGenerationsPermittedResolver();
			this.criticalCount = params.criticalCount;

			this.predictionStatusGenerationOptions = consts.predictionGenerationStatus;
			this.isExitMessageShown = ko.observable();
			this.exitMessage = ko.observable();
			this.pollId = null;

			this.execColumns = [
				{
					title: 'Date',
					className: this.classes('col-exec-date'),
					render: datatableUtils.getDateFieldFormatter('startTime'),
				},
				{
					title: 'Status',
					data: 'status',
					className: this.classes('col-exec-status'),
					render: (s, p, d) => s === 'FAILED' ? `<a href='#' data-bind="css: $component.classes('status-link'), click: () => $component.showExitMessage('${d.sourceKey}', ${d.id})">${s}</a>` : s,
				},
				{
					title: 'Duration',
					className: this.classes('col-exec-duration'),
					render: (s, p, d) => {
						const endTime = d.endTime || Date.now();
						return d.startTime ? momentApi.formatDuration(endTime - d.startTime) : '';
					}
				},
				{
					title: 'Results',
					className: this.classes('col-exec-results'),
					render: (s, p, d) => {
						return (d.status === this.predictionStatusGenerationOptions.COMPLETED || d.status === this.predictionStatusGenerationOptions.FAILED) && this.isResultsViewPermitted(d.id) && d.numResultFiles > 0 ?
							`<a href='#' data-bind="ifnot: $component.isDownloadInProgress(id), css: $component.classes('reports-link'), click: $component.downloadResults.bind($component, id)"><i class="prediction-generation__action-ico fa fa-download"></i> Download ${d.numResultFiles} files</a><span data-bind="if: $component.isDownloadInProgress(id)"><i class="prediction-generation__action-ico fa fa-spinner fa-spin"></i> Downloading ${d.numResultFiles} files...</span>`
							: '-';
					}
				},
			];
			this.downloading = ko.observableArray([]);
			this.isResultsDownloading = ko.computed(() => this.downloading().length > 0);
			this.executionGroups = ko.observableArray([]);
			this.isViewGenerationsPermitted() && this.startPolling();
		}

		startPolling() {
			this.pollId = PollService.add({
				callback: silently => this.loadData({ silently }),
				interval: 10000,
				isSilentAfterFirstCall: true,
			});
		}

		dispose() {
			PollService.stop(this.pollId);
		}

		isDownloadInProgress(id) {
			return ko.computed(() => this.downloading.indexOf(id) > -1);
		}

		isGeneratePermitted(sourceKey) {
			return !this.dirtyFlag().isDirty() && PermissionService.isPermittedGenerate(sourceKey, this.analysisId()) 
				&& config.api.isExecutionEngineAvailable() && this.criticalCount() <= 0;
		}

		generateDisabledReason(sourceKey) {
			if (this.isGeneratePermitted(sourceKey)) return null;
			if (this.criticalCount() > 0) return globalConsts.disabledReasons.INVALID_DESIGN;
			if (!config.api.isExecutionEngineAvailable()) return globalConsts.disabledReasons.ENGINE_NOT_AVAILABLE;
			if (this.dirtyFlag().isDirty()) return globalConsts.disabledReasons.DIRTY;
			return globalConsts.disabledReasons.ACCESS_DENIED;
		}

		isResultsViewPermitted(id) {
			return PermissionService.isPermittedViewResults(id);
		}

		findLatestSubmission(sourceKey) {
			const sg = this.executionGroups().find(g => g.sourceKey === sourceKey);
			if (sg) {
				const submissions = [...sg.submissions()];
				if (submissions.length > 0) {
					submissions.sort((a, b) => b.endTime - a.endTime); // sort descending
					return submissions.find(s => s.status === this.predictionStatusGenerationOptions.COMPLETED);
				}
			}
			return null;
		}

		downloadLatestResults(sourceKey) {
			const submission = this.findLatestSubmission(sourceKey);
			if (submission) {
				this.downloadResults(submission.id);
			}
		}

		isViewGenerationsPermittedResolver() {
			return ko.computed(() => this.analysisId() ? PermissionService.isPermittedListGenerations(this.analysisId()) : true);
		}

		async loadData({silently = false} = {}) {
			!silently && this.loading(true);

			try {
				const allSources = await SourceService.loadSourceList();
				const executionList = await PredictionService.listGenerations(this.analysisId());

				let sourceList = allSources.filter(source => {
					return (source.daimons.filter(function (daimon) { return daimon.daimonType === "CDM"; }).length > 0
						&& source.daimons.filter(function (daimon) { return daimon.daimonType === "Results"; }).length > 0);
				});

				sourceList = lodash.sortBy(sourceList, ["sourceName"]);

				sourceList.forEach(s => {
					let group = this.executionGroups().find(g => g.sourceKey === s.sourceKey);
					if (!group) {
						group = {
							sourceKey: s.sourceKey,
							sourceName: s.sourceName,
							submissions: ko.observableArray(),
							status: ko.observable(),
						};
						this.executionGroups.push(group);
					}

					group.submissions(executionList.filter(e => e.sourceKey === s.sourceKey));
					group.status(group.submissions().find(s => s.status === this.predictionStatusGenerationOptions.STARTED
						|| s.status === this.predictionStatusGenerationOptions.RUNNING) ?
						this.predictionStatusGenerationOptions.STARTED :
						this.predictionStatusGenerationOptions.COMPLETED);
				});
			} catch (e) {
				console.error(e);
			} finally {
				this.loading(false);
			}
		}

		generate(sourceKey) {

			const executionGroup = this.executionGroups().find(g => g.sourceKey === sourceKey);

			this.loading(true);
			ExecutionUtils.StartExecution(executionGroup)
				.then(() => PredictionService.generate(this.analysisId(), sourceKey))
				.then((data) => {
					jobDetailsService.createJob(data);
					this.loadData()
				})
				.catch(() => {});
		}

		toggleSection(idx) {
			this.expandedSection() === idx ? this.expandedSection(null) : this.expandedSection(idx);
		}

		async downloadResults(generationId) {
			this.downloading.push(generationId);
			try {
				await FileService.loadZip(config.webAPIRoot + consts.apiPaths.downloadResults(generationId), `prediction-analysis-results-${generationId}.zip`);
			} finally {
				this.downloading.remove(generationId);
			}
		}

		showExitMessage(sourceKey, id) {
			const group = this.executionGroups().find(g => g.sourceKey === sourceKey) || { submissions: ko.observableArray() };
			const submission = group.submissions().find(s => s.id === id);
			if (submission && submission.exitMessage) {
				this.exitMessage(submission.exitMessage);
				this.isExitMessageShown(true);
			}
		}

	}

	commonUtils.build('prediction-executions', PredictionGeneration, view);

});