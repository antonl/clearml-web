import {TaskStatusEnum} from '../../../business-logic/model/tasks/taskStatusEnum';
import {ExperimentTableColFieldsEnum} from './experiments.model';

export type experimentSectionsEnum =
  'MODEL_INPUT'
  | 'MODEL_SOURCE'
  | 'MODEL_OUTPUT'
  | 'MODEL_NETWORK_DESIGN';
export const experimentSections = {
  MODEL_INPUT         : 'MODEL_INPUT' as experimentSectionsEnum,
  MODEL_SOURCE        : 'MODEL_SOURCE' as experimentSectionsEnum,
  MODEL_OUTPUT        : 'MODEL_OUTPUT' as experimentSectionsEnum,
  MODEL_NETWORK_DESIGN: 'MODEL_NETWORK_DESIGN' as experimentSectionsEnum,
};

export const DIGITS_AFTER_DECIMAL = 6;

export const EXPERIMENTS_TABLE_COL_FIELDS = {
  SELECTED      : 'selected' as ExperimentTableColFieldsEnum,
  ID            : 'id' as ExperimentTableColFieldsEnum,
  TYPE          : 'type' as ExperimentTableColFieldsEnum,
  NAME          : 'name' as ExperimentTableColFieldsEnum,
  TAGS          : 'tags' as ExperimentTableColFieldsEnum,
  USER          : 'user.name' as ExperimentTableColFieldsEnum,
  STARTED       : 'started' as ExperimentTableColFieldsEnum,
  COMPLETED     : 'completed' as ExperimentTableColFieldsEnum,
  STATUS        : 'status' as ExperimentTableColFieldsEnum,
  LAST_UPDATE   : 'last_update' as ExperimentTableColFieldsEnum,
  LAST_ITERATION: 'last_iteration' as ExperimentTableColFieldsEnum,
  COMMENT       : 'comment' as ExperimentTableColFieldsEnum,
  PROJECT       : 'project.name' as ExperimentTableColFieldsEnum,
  METRIC        : 'project.name' as ExperimentTableColFieldsEnum,
  HYPER_PARAM   : 'project.name' as ExperimentTableColFieldsEnum
};

export enum ExperimentTagsEnum {
  Development = 'development',
  Hidden = 'archived'
}

export const EXPERIMENTS_TAGS = {};
export const EXPERIMENTS_TAGS_TOOLTIP = {};
export const EXPERIMENTS_STATUS_LABELS = {
  [TaskStatusEnum.Created]   : 'Draft',
  [TaskStatusEnum.Queued]    : 'Pending',
  [TaskStatusEnum.InProgress]: 'Running',
  [TaskStatusEnum.Completed] : 'Completed',
  [TaskStatusEnum.Published] : 'Published',
  [TaskStatusEnum.Failed]    : 'Failed',
  [TaskStatusEnum.Stopped]   : 'Aborted',
  [TaskStatusEnum.Closed]    : 'Completed'
};
export const DevWarningEnabled = false;
