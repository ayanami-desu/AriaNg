(function () {
    'use strict';

    angular.module('ariaNg').controller('TransferGatewayTaskController', ['$rootScope', '$scope', '$interval', 'clipboard', 'ariaNgCommonService', 'aria2TaskService', 'transferGatewayService', function ($rootScope, $scope, $interval, clipboard, ariaNgCommonService, aria2TaskService, transferGatewayService) {
        var getErrorMessage = function (error, fallback) {
            if (error && error.data && error.data.error) {
                return error.data.error;
            }

            return fallback;
        };

        $scope.gatewayEnabled = transferGatewayService.isEnabled();
        $scope.tasks = [];
        $scope.destinations = [];
        $scope.selected = {};
        $scope.filters = {
            status: '',
            destinationId: '',
            query: ''
        };
        $scope.statuses = [
            { value: '', label: 'All Statuses' },
            { value: 'queued', label: 'Queued' },
            { value: 'downloading', label: 'Downloading' },
            { value: 'transfer_pending', label: 'Transfer Pending' },
            { value: 'transferring', label: 'Transferring' },
            { value: 'completed', label: 'Completed' },
            { value: 'failed', label: 'Failed' }
        ];
        $scope.retryModes = [
            { value: 'upload', label: 'Retry Upload Only' },
            { value: 'full', label: 'Full Chain Retry' }
        ];
        $scope.retryMode = 'upload';

        $scope.statusLabel = function (status) {
            for (var i = 0; i < $scope.statuses.length; i++) {
                if ($scope.statuses[i].value === status) {
                    return $scope.statuses[i].label;
                }
            }

            return status || 'Unknown';
        };
        var getMagnetTaskName = function (url) {
            if (!angular.isString(url)) {
                return '';
            }

            var queryStart = url.indexOf('?');
            if (queryStart < 0) {
                return '';
            }

            var query = url.substring(queryStart + 1);
            var match = /(?:^|&)dn=([^&]*)/i.exec(query);
            if (!match) {
                return '';
            }

            var name = match[1];
            try {
                name = decodeURIComponent(name.replace(/\+/g, ' '));
            } catch (error) {
                // Keep the original value when a malformed escape is supplied.
            }
            return name.trim();
        };
        $scope.getTaskName = function (task) {
            if (!task) {
                return '';
            }

            var name = task.task_name || task.name || task.taskName || '';
            if (name) {
                return name;
            }

            if (angular.isArray(task.urls) && task.urls.length > 0 && $scope.isMagnetTask(task)) {
                var magnetName = getMagnetTaskName(task.urls[0]);
                if (magnetName) {
                    return magnetName;
                }
            }

            if (angular.isArray(task.file_names) && task.file_names.length > 0) {
                return task.file_names[0];
            }

            return '';
        };

        $scope.isMagnetTask = function (task) {
            return !!(task && task.urls && task.urls.length && task.urls[0].toLowerCase().indexOf('magnet:?') === 0);
        };

        $scope.copyMagnet = function (task) {
            if ($scope.isMagnetTask(task)) {
                clipboard.copyText(task.urls[0]);
            }
        };

        $scope.isRetryable = function (task) {
            return !!task;
        };

        $scope.selectedTaskIds = function () {
            var ids = [];
            for (var i = 0; i < $scope.tasks.length; i++) {
                var task = $scope.tasks[i];
                if ($scope.selected[task.id]) {
                    ids.push(task.id);
                }
            }
            return ids;
        };

        $scope.selectedTaskCount = function () {
            return $scope.selectedTaskIds().length;
        };

        $scope.hasSelectedRetryableTask = function () {
            return $scope.selectedTaskCount() > 0;
        };

        $scope.isAllSelected = function () {
            if ($scope.tasks.length < 1) {
                return false;
            }

            for (var i = 0; i < $scope.tasks.length; i++) {
                if (!$scope.selected[$scope.tasks[i].id]) {
                    return false;
                }
            }

            return true;
        };

        $scope.toggleAll = function () {
            var selected = !$scope.isAllSelected();
            for (var i = 0; i < $scope.tasks.length; i++) {
                $scope.selected[$scope.tasks[i].id] = selected;
            }
        };

        var clearMissingSelections = function () {
            var available = {};
            for (var i = 0; i < $scope.tasks.length; i++) {
                available[$scope.tasks[i].id] = true;
            }
            for (var id in $scope.selected) {
                if ($scope.selected.hasOwnProperty(id) && !available[id]) {
                    delete $scope.selected[id];
                }
            }
        };
        var taskNameRequests = {};
        var loadTaskName = function (task) {
            if (!task || !task.id || !task.gid || $scope.getTaskName(task) || task.status === 'completed' || task.status === 'failed' || taskNameRequests[task.gid]) {
                return;
            }

            taskNameRequests[task.gid] = true;
            aria2TaskService.getTaskStatus(task.gid, function (response) {
                delete taskNameRequests[task.gid];
                if (!response || !response.success || !response.data || !response.data.hasTaskName) {
                    return;
                }

                for (var i = 0; i < $scope.tasks.length; i++) {
                    if ($scope.tasks[i].id === task.id) {
                        $scope.tasks[i].taskName = response.data.taskName;
                        break;
                    }
                }
            }, true);
        };
        var loadTaskNames = function (tasks) {
            for (var i = 0; i < tasks.length; i++) {
                loadTaskName(tasks[i]);
            }
        };
        var taskRequest = null;

        var hasActiveTask = function () {
            for (var i = 0; i < $scope.tasks.length; i++) {
                if ($scope.tasks[i].status !== 'completed' && $scope.tasks[i].status !== 'failed') {
                    return true;
                }
            }
            return false;
        };

        $scope.loadTasks = function (silent) {
            if (!$scope.gatewayEnabled || taskRequest) {
                return taskRequest;
            }

            taskRequest = transferGatewayService.getTasks($scope.filters).then(function (tasks) {
                $scope.tasks = angular.isArray(tasks) ? tasks : [];
                clearMissingSelections();
                loadTaskNames($scope.tasks);
                return $scope.tasks;
            }, function (error) {
                if (!silent) {
                    ariaNgCommonService.showError(getErrorMessage(error, 'Failed to load gateway tasks.'));
                    throw error;
                }
                return $scope.tasks;
            }).finally(function () {
                taskRequest = null;
            });
            if (!silent) {
                $rootScope.loadPromise = taskRequest;
            }
            return taskRequest;
        };

        $scope.resetFilters = function () {
            $scope.filters.status = '';
            $scope.filters.destinationId = '';
            $scope.filters.query = '';
            $scope.loadTasks();
        };

        var showRetryResult = function (response) {
            var successCount = response && response.succeeded ? response.succeeded.length : 0;
            var failedCount = response && response.failed ? response.failed.length : 0;
            if (failedCount > 0) {
                ariaNgCommonService.showInfo('Operation Result', '{successCount} gateway tasks have been retried and {failedCount} tasks failed.', null, {
                    textParams: {
                        successCount: successCount,
                        failedCount: failedCount
                    }
                });
            }
        };

        var retryTasks = function (ids) {
            $rootScope.loadPromise = transferGatewayService.retryTasks(ids, $scope.retryMode).then(function (response) {
                if (!response || !response.succeeded || response.succeeded.length < 1) {
                    ariaNgCommonService.showError('Failed to retry gateway tasks.');
                } else {
                    showRetryResult(response);
                }
                $scope.selected = {};
                return $scope.loadTasks();
            }, function (error) {
                ariaNgCommonService.showError(getErrorMessage(error, 'Failed to retry gateway tasks.'));
                throw error;
            });
            return $rootScope.loadPromise;
        };

        var deleteTasks = function (ids) {
            $rootScope.loadPromise = transferGatewayService.deleteTasks(ids).then(function (response) {
                var deletedCount = response && response.deleted ? response.deleted.length : 0;
                var failures = response && response.failed ? response.failed : [];
                if (failures.length > 0) {
                    var failureMessage = 'Failed to delete gateway tasks.';
                    for (var i = 0; i < failures.length; i++) {
                        failureMessage += '\n' + (failures[i].id || '') + ': ' + failures[i].error;
                    }
                    ariaNgCommonService.showError(failureMessage);
                } else if (deletedCount < 1) {
                    ariaNgCommonService.showError('Failed to delete gateway tasks.');
                }
                $scope.selected = {};
                return $scope.loadTasks();
            }, function (error) {
                ariaNgCommonService.showError(getErrorMessage(error, 'Failed to delete gateway tasks.'));
                throw error;
            });
            return $rootScope.loadPromise;
        };

        var retryConfirmation = function () {
            if ($scope.retryMode === 'full') {
                return 'Full Chain Retry will cancel and delete the current task before starting a new download. Continue?';
            }
            return 'Retry upload for the selected tasks? The download directory must exist.';
        };

        $scope.retrySelected = function () {
            var ids = $scope.selectedTaskIds();
            if (ids.length < 1) {
                return;
            }

            ariaNgCommonService.confirm('Confirm Retry', retryConfirmation(), 'info', function () {
                retryTasks(ids);
            });
        };

        $scope.retryTask = function (task) {
            if (!task || !$scope.isRetryable(task)) {
                return;
            }

            ariaNgCommonService.confirm('Confirm Retry', retryConfirmation(), 'info', function () {
                retryTasks([task.id]);
            });
        };

        var deleteConfirmation = function () {
            return 'Delete selected gateway tasks? This will cancel aria2 and remove downloaded data.';
        };

        $scope.deleteSelected = function () {
            var ids = $scope.selectedTaskIds();
            if (ids.length < 1) {
                return;
            }

            ariaNgCommonService.confirm('Confirm Delete', deleteConfirmation(), 'warning', function () {
                deleteTasks(ids);
            });
        };

        $scope.deleteTask = function (task) {
            if (!task) {
                return;
            }

            ariaNgCommonService.confirm('Confirm Delete', deleteConfirmation(), 'warning', function () {
                deleteTasks([task.id]);
            });
        };

        if ($scope.gatewayEnabled) {
            var destinationRequest = transferGatewayService.getDestinations().then(function (destinations) {
                $scope.destinations = angular.isArray(destinations) ? destinations : [];
                return $scope.destinations;
            }, function (error) {
                ariaNgCommonService.showError(getErrorMessage(error, 'Failed to load gateway tasks.'));
                throw error;
            });
            $rootScope.loadPromise = destinationRequest.then(function () {
                return $scope.loadTasks();
            });
            var taskRefresh = $interval(function () {
                if (hasActiveTask()) {
                    $scope.loadTasks(true);
                }
            }, 2000);
            $scope.$on('$destroy', function () {
                $interval.cancel(taskRefresh);
            });
        }
    }]);
}());
