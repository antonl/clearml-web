import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {activeLoader, deactivateLoader} from '../core/actions/layout.actions';
import {
  SearchActivate,
  SearchClear,
  searchExperiments,
  searchModels,
  searchPipelines,
  searchProjects,
  searchSetTerm,
  searchStart,
  SetExperimentsResults,
  SetModelsResults, setPipelinesResults,
  SetProjectsResults
} from './dashboard-search.actions';
import {EXPERIMENT_SEARCH_ONLY_FIELDS, SEARCH_ACTIONS, SEARCH_PAGE_SIZE} from './dashboard-search.consts';
import {ApiProjectsService} from '~/business-logic/api-services/projects.service';
import {requestFailed} from '../core/actions/http.actions';
import {Store} from '@ngrx/store';
import {selectActiveSearch} from './dashboard-search.reducer';
import {ProjectsGetAllExRequest} from '~/business-logic/model/projects/projectsGetAllExRequest';
import {ApiTasksService} from '~/business-logic/api-services/tasks.service';
import {ApiModelsService} from '~/business-logic/api-services/models.service';
import {catchError, mergeMap, map, switchMap, withLatestFrom} from 'rxjs/operators';
import {escapeRegex} from '../shared/utils/shared-utils';

@Injectable()
export class DashboardSearchEffects {
  constructor(
    private actions: Actions,
    public projectsApi: ApiProjectsService,
    public modelsApi: ApiModelsService,
    public experimentsApi: ApiTasksService,
    private store: Store<any>
  ) {
  }

  /* eslint-disable @typescript-eslint/naming-convention */
  activeLoader = createEffect(() => this.actions.pipe(
    ofType(SEARCH_ACTIONS.SEARCH_PROJECTS, SEARCH_ACTIONS.SEARCH_MODELS, SEARCH_ACTIONS.SEARCH_EXPERIMENTS, SEARCH_ACTIONS.SEARCH_PIPELINES),
    map(action => activeLoader(action.type))
  ));
  // add actions for each search
  startSearch = createEffect(() => this.actions.pipe(
    ofType(searchStart.type),
    withLatestFrom(this.store.select(selectActiveSearch)),
    mergeMap(([action, active]: [ReturnType<typeof searchStart>, boolean]) => {
      const actionsToFire = [];
      if (!active) {
        actionsToFire.push(new SearchClear());
        actionsToFire.push(new SearchActivate());
      }
      actionsToFire.push(searchSetTerm(action));
      actionsToFire.push(searchProjects(action));
      actionsToFire.push(searchPipelines(action));
      actionsToFire.push(searchExperiments(action));
      actionsToFire.push(searchModels(action));
      return actionsToFire;
    })
  ));

  searchProjects = createEffect(() => this.actions.pipe(
    ofType(searchProjects.type),
    switchMap((action: ReturnType<typeof searchProjects>) => this.projectsApi.projectsGetAllEx({
      _any_: {
        ...(action.query && {pattern: action.regExp ? action.query : escapeRegex(action.query) + '[^/]*$'}),
        fields: ['name', 'id']
      },
      include_stats_filter: {system_tags: ['-pipeline']},
      stats_for_state: ProjectsGetAllExRequest.StatsForStateEnum.Active,
      scroll_id: null,
      size: SEARCH_PAGE_SIZE,
      include_stats: true,
      only_fields: ['name', 'company', 'user', 'created', 'default_output_destination']
    } as ProjectsGetAllExRequest).pipe(
      mergeMap(res => [new SetProjectsResults(res.projects), deactivateLoader(action.type)]),
      catchError(error => [deactivateLoader(action.type), requestFailed(error)])))
  ));

  searchPipelines = createEffect(() => this.actions.pipe(
    ofType(searchPipelines.type),
    switchMap((action: ReturnType<typeof searchPipelines>) => this.projectsApi.projectsGetAllEx({
      _any_: {
        ...(action.query && {pattern: action.regExp ? action.query : escapeRegex(action.query) + '[^/]*$'}),
        fields: ['name', 'id']
      },
      search_hidden: true,
      shallow_search: false,
      system_tags: ['pipeline'],
      stats_for_state: ProjectsGetAllExRequest.StatsForStateEnum.Active,
      scroll_id: null,
      size: SEARCH_PAGE_SIZE,
      include_stats: true,
      only_fields: ['name', 'company', 'user', 'created', 'default_output_destination', 'tags', 'system_tags']
    } as ProjectsGetAllExRequest).pipe(
      mergeMap(res => [setPipelinesResults({pipelines:res.projects}), deactivateLoader(action.type)]),
      catchError(error => [deactivateLoader(action.type), requestFailed(error)])))
  ));

  searchModels = createEffect(() => this.actions.pipe(
    ofType(searchModels.type),
    switchMap((action: ReturnType<typeof searchModels>) => this.modelsApi.modelsGetAllEx({
      _any_: {
        ...(action.query && {pattern: action.regExp ? action.query : escapeRegex(action.query)}),
        fields: ['name', 'id']
      },
      scroll_id: null,
      size: SEARCH_PAGE_SIZE,
      system_tags: ['-archived'],
      only_fields: ['labels', 'ready', 'created', 'framework', 'user.name', 'name', 'parent.name', 'task.name', 'id', 'company']
    }).pipe(
      mergeMap(res => [new SetModelsResults(res.models), deactivateLoader(action.type)]),
      catchError(error => [deactivateLoader(action.type), requestFailed(error)])))
  ));

  searchExperiments = createEffect(() => this.actions.pipe(
    ofType(searchExperiments.type),
    switchMap((action: ReturnType<typeof searchExperiments>) => this.experimentsApi.tasksGetAllEx({
      _any_: {
        ...(action.query && {pattern: action.regExp ? action.query : escapeRegex(action.query)}),
        fields: ['name', 'id']
      },
      scroll_id: null,
      size: SEARCH_PAGE_SIZE,
      only_fields: EXPERIMENT_SEARCH_ONLY_FIELDS,
      type: ['__$not', 'annotation_manual', '__$not', 'annotation', '__$not', 'dataset_import'],
      system_tags: ['-archived', '-pipeline']
    }).pipe(
      mergeMap(res => [new SetExperimentsResults(res.tasks), deactivateLoader(action.type)]),
      catchError(error => [deactivateLoader(action.type), requestFailed(error)])))
  ));
}
