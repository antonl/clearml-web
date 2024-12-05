import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import {Store} from '@ngrx/store';
import {
  addReportsTags,
  archiveReport,
  deleteReport,
  deleteResource,
  getReport,
  getReportsTags,
  moveReport,
  publishReport,
  restoreReport,
  setDirty,
  setEditMode,
  setReport,
  setReportChanges,
  updateReport
} from '@common/reports/reports.actions';
import {selectRouterParams} from '@common/core/reducers/router-reducer';
import {
  catchError, debounceTime,
  distinctUntilChanged,
  filter,
  map,
  switchMap, withLatestFrom,
} from 'rxjs/operators';
import {fromEvent, lastValueFrom, Observable, Subscription, take, combineLatest, merge} from 'rxjs';
import {selectEditingReport, selectReport, selectReportsTags} from '@common/reports/reports.reducer';
import {ReportStatusEnum} from '~/business-logic/model/reports/reportStatusEnum';
import {getBaseName, isExample} from '@common/shared/utils/shared-utils';
import {MatDialog} from '@angular/material/dialog';
import {ConfirmDialogComponent} from '@common/shared/ui-components/overlay/confirm-dialog/confirm-dialog.component';
import {activeLoader, addMessage, deactivateLoader} from '@common/core/actions/layout.actions';
import {ICONS, MESSAGES_SEVERITY} from '@common/constants';
import {IReport} from '@common/reports/reports.consts';
import {MarkdownEditorComponent} from '@common/shared/components/markdown-editor/markdown-editor.component';
import {BreakpointObserver} from '@angular/cdk/layout';
import {ActivatedRoute, Router} from '@angular/router';
import {ClipboardService} from 'ngx-clipboard';
import {UploadResult} from 'ngx-markdown-editor';
import {HttpClient} from '@angular/common/http';
import {HTTP} from '~/app.constants';
import {convertToReverseProxy} from '~/shared/utils/url';
import {escapeRegex} from '@common/shared/utils/escape-regex';
import {Actions, ofType} from '@ngrx/effects';
import {MatMenuTrigger} from '@angular/material/menu';
import {TagsMenuComponent} from '@common/shared/ui-components/tags/tags-menu/tags-menu.component';
import {selectBlockUserScript, selectDefaultNestedModeForFeature, selectSelectedProject} from '@common/core/reducers/projects.reducer';
import {setBreadcrumbsOptions} from '@common/core/actions/projects.actions';

const replaceSlash = (part) => part
  .replace('\\', '/')
  .replace(/^\//, '')
  .replace(/\/$/, '')
  .replace('/', '.slash.')
  .replace(
    /[#"';?:@&=+$,%!)(\r\n]/g,
    c => `0x${c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()}`
  );

@Component({
  selector: 'sm-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportComponent implements OnInit, OnDestroy {
  private sub = new Subscription();
  public icons = ICONS;
  public report: IReport;
  public example: boolean;
  public editDesc: boolean;
  public orgDesc: string;
  public draft: boolean;
  public archived: boolean;
  public reportTags$: Observable<string[]>;
  public smallScreen$: Observable<boolean>;
  public editMode$: Observable<boolean>;
  public printStyle = {
    table: {border: '1px solid gray'},
    th: {border: '1px solid gray'},
    td: {border: '1px solid gray'},
    details: {border: '1px solid #ccc', margin: '6px 0', padding: '6px'},

    code: {'white-space': 'pre'},
    iframe: {border: 'none', width: '840px'}
  };
  public widthExpanded = false;
  public handleUpload: (files: File[]) => Promise<UploadResult[]>;
  public showDescription = false;
  public resources: { unused: boolean; url: string }[];
  public menuPosition = { x: 0, y: 0 };
  public blockUserScripts$: Observable<boolean>;

  @ViewChild(MarkdownEditorComponent) mdEditor: MarkdownEditorComponent;
  @ViewChild('printHiddenButton') printHiddenButton: ElementRef;

  constructor(
    private store: Store,
    public cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private breakpointObserver: BreakpointObserver,
    private router: Router,
    private route: ActivatedRoute,
    private _clipboardService: ClipboardService,
    private http: HttpClient,
    private actions$: Actions
  ) {
    this.smallScreen$ = breakpointObserver.observe('(max-width: 1200px)')
      .pipe(map(state => state.matches));
    this.editMode$ = this.store.select(selectEditingReport);
    this.reportTags$ = this.store.select(selectReportsTags);
    this.blockUserScripts$ = this.store.select(selectBlockUserScript);

    this.store.dispatch(getReportsTags());

    this.sub.add(
      this.store.select(selectRouterParams)
        .pipe(
          map(params => params?.reportId),
          filter(id => !!id),
          distinctUntilChanged()
        )
        .subscribe(id => this.store.dispatch(getReport({id})))
    );

    this.handleUpload = (files: File[]): Promise<UploadResult[]> => {
      this.store.dispatch(activeLoader('upload'));
      const filesServerUrl = convertToReverseProxy(HTTP.FILE_BASE_URL);

      const valid = Array.from(files).filter(f => f.type.startsWith('image/')).map(file => {
        const reader = new FileReader();
        const obs = fromEvent(reader, 'load')
          .pipe(
            switchMap(() => {
              const img = new Image();
              img.src = reader.result as string;
              return merge(
                fromEvent(img, 'load'),
                fromEvent(img, 'error'),
              )
                .pipe(
                  map(() => {
                    if (img.width > 0 && img.height > 0) {
                      return file;
                    }
                    throw new Error('Invalid file');
                  })
                );
            }),
            catchError((err, caught) => {
              this.store.dispatch(addMessage(MESSAGES_SEVERITY.ERROR, 'invalid file'));
              this.store.dispatch(deactivateLoader('upload'));
              throw caught;
            })
          );
        reader.readAsDataURL(file);
        return obs;
      });
      if (valid.length === 0) {
        this.store.dispatch(addMessage(MESSAGES_SEVERITY.ERROR, 'invalid file type'));
        this.store.dispatch(deactivateLoader('upload'));
        return Promise.reject('Invalid file type');
      }
      const uploads$ = combineLatest(valid).pipe(
        debounceTime(0),
        take(1),
        switchMap(validFiles => {
          const formData: FormData = new FormData();
          const results = [] as UploadResult[];
          validFiles
            .forEach(file => {
              const url = `reports/${this.report.id}/${replaceSlash(file.name)}`;
              formData.append(url, file);
              results.push({
                name: file.name,
                url: `${filesServerUrl}/${encodeURI(url)}`,
                isImg: true});
            });

          return this.http.post(filesServerUrl, formData, {withCredentials: true})
            .pipe(
              catchError((err) => {
                this.store.dispatch(addMessage(MESSAGES_SEVERITY.ERROR, 'Upload failed' + err?.message));
                this.store.dispatch(deactivateLoader('upload'));
                throw new Error('upload failed');
              }),
              map(() => {
                this.store.dispatch(deactivateLoader('upload'));
                this.store.dispatch(updateReport({
                  id: this.report.id,

                  changes: {report_assets: Array.from(new Set((this.report.report_assets || []).concat(results.map(r => r.url))))}
                }));
                return results;
              })
            );
        })
      );
      return lastValueFrom(uploads$);
    };
  }
  setupBreadcrumbsOptions() {
    this.sub.add(
      combineLatest([
        this.store.select(selectReport),
        this.store.select(selectSelectedProject)
      ]).pipe(
        filter(([selectedReport]) => !!selectedReport),
        withLatestFrom(this.store.select(selectDefaultNestedModeForFeature))
      ).subscribe(([[selectedReport,], defaultNestedModeForFeature]) => this.store.dispatch(setBreadcrumbsOptions({
          breadcrumbOptions: {
            showProjects: !!selectedReport,
            featureBreadcrumb: {
              name: 'REPORTS',
              url: defaultNestedModeForFeature['reports'] ? 'reports/*/projects' : 'reports'
            },
            projectsOptions: {
              basePath: 'reports',
              filterBaseNameWith: ['.reports'],
              compareModule: null,
              showSelectedProject: false,
              selectedProjectBreadcrumb: null
            },
            subFeatureBreadcrumb: {
              name: selectedReport.name,
              onlyWithProject: true
            }
          }
        }))
      ));
  }

  ngOnInit() {
    this.sub.add(
      this.store.select(selectReport)
        .pipe(filter(report => !!report))
        .subscribe(report => {
          this.report = report;
          this.calculateUnusedResources();
          this.example = isExample(report);
          this.archived = report?.system_tags?.includes('archived');
          this.router.navigate(['.'], {relativeTo: this.route, queryParams: {...(this.archived && {archive: this.archived})}});
          this.draft = this.report.status !== ReportStatusEnum.Published;
          this.cdr.detectChanges();
        })
    );
    this.setupBreadcrumbsOptions();
  }

  save(report: string) {
    this.store.dispatch(updateReport({id: this.report.id, changes: {report}}));
    this.store.dispatch(setDirty({dirty: false}));
    Array.from(window.frames).forEach(frame => frame.postMessage('renderPlot', '*'));
  }

  openTagMenu(event: MouseEvent, tagMenuTrigger: MatMenuTrigger, tagsMenu: TagsMenuComponent) {
    if (!tagMenuTrigger) {
      return;
    }
    this.menuPosition = {x: event.clientX, y: event.clientY};
    window.setTimeout(() => {
      tagMenuTrigger.openMenu();
      tagsMenu.focus();
    });
  }

  addTag(tag: string) {
    const tags = [...this.report.tags, tag];
    tags.sort();
    this.store.dispatch(updateReport({id: this.report.id, changes: {tags}, refresh: true}));
    this.store.dispatch(addReportsTags({tags: [tag]}));
  }

  removeTag(tag: string) {
    this.store.dispatch(updateReport({
      id: this.report.id,
      changes: {tags: this.report.tags.filter(t => t !== tag)},
      refresh: true
    }));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.store.dispatch(setReport({report: null}));
  }

  saveDesc(comment: string) {
    this.store.dispatch(updateReport({id: this.report.id, changes: {comment}}));
    this.editDesc = false;
    this.orgDesc = null;
  }

  publish() {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'PUBLISH REPORT',
        body: '<p class="text-center">After publishing the report it can no longer be edited</p>',
        yes: 'Publish',
        no: 'Cancel',
        iconClass: 'al-icon al-ico-publish'
      }
    }).afterClosed().subscribe(accept =>
      accept && this.store.dispatch(publishReport({id: this.report.id}))
    );
  }

  archive() {
    if (this.archived) {
      this.store.dispatch(restoreReport({report: this.report}));
    } else {
      this.store.dispatch(archiveReport({report: this.report}));
    }
  }

  share() {
    this._clipboardService.copyResponse$
      .pipe(take(1))
      .subscribe(() => this.store.dispatch(addMessage(MESSAGES_SEVERITY.SUCCESS, 'Report link copied to clipboard'))
      );
    this._clipboardService.copy(window.location.href);
  }

  moveToProject() {
    this.store.dispatch(moveReport({report: this.report}));
  }

  editReportDesc(descElement) {
    const end = descElement.value.length;
    this.orgDesc = this.report.comment;
    this.editDesc = true;
    setTimeout(() => {
      descElement.setSelectionRange(end, end);
      descElement.focus();
    }, 100);
  }

  editModeChanged() {
    this.widthExpanded = this.mdEditor.isExpand;
    this.store.dispatch(setEditMode({editing: this.mdEditor.editMode}));
    setTimeout(() => Array.from(window.frames).forEach(frame => frame.postMessage('resizePlot', '*')), 500);
  }

  dirtyChanged(isDirty: boolean) {
    this.store.dispatch(setDirty({dirty: isDirty}));
  }

  copyMarkdown() {
    this._clipboardService.copyResponse$
      .pipe(take(1))
      .subscribe(() => this.store.dispatch(addMessage(MESSAGES_SEVERITY.SUCCESS, 'Report markdown copied to clipboard'))
      );
    this._clipboardService.copy(this.mdEditor.data);
  }

  deleteReport() {
    this.store.dispatch(deleteReport({report: this.report}));
  }

  deleteResource(resource: string) {
    this.store.dispatch(deleteResource({resource}));
    this.actions$.pipe(
      ofType(setReportChanges),
      take(1)
    )
      .subscribe(() => {
        const test = new RegExp(`!\\[(.*)\\]\\(${escapeRegex(resource)}\\)`, 'gm');
        const ace = this.mdEditor.ace;
        let range = ace.find(test, {
          wrap: true,
          caseSensitive: true,
          wholeWord: true,
          regExp: false,
          preventScroll: true // do not change selection
        });

        while (range) {
          ace.session.replace(range, `![${getBaseName(resource)}]()`);
          range = ace.find(test, {
            wrap: true,
            caseSensitive: true,
            wholeWord: true,
            regExp: false,
            preventScroll: true // do not change selection
          });
        }
      });
  }

  calculateUnusedResources(unsavedReport?: string) {
    if (unsavedReport !== undefined || this.report?.report !== undefined) {
      const test = /!\[.*]\((.*)\)/g;
      const usedResources = Array.from(new Set(Array.from((unsavedReport ?? this.report.report).matchAll(test)).map(match => match[1])));
      this.resources = this.report.report_assets.map(resource => ({
        url: resource,
        unused: !usedResources.includes(resource)
      }));
    }
  }

  printReport() {
    const sourceNode = document.getElementById('print-element');
    const clonedNode = sourceNode.cloneNode(true) as Element;
    clonedNode.id = 'print-element-temp';
    clonedNode.querySelectorAll('#print-element-temp iframe').forEach((iframeElement: HTMLIFrameElement) => {
      iframeElement.src = `${iframeElement.src}&light=true`;
    });
    document.body.appendChild(clonedNode);
    window.setTimeout(() => document.body.removeChild(clonedNode), 3000);
    this.printHiddenButton.nativeElement.click();
  }
}
