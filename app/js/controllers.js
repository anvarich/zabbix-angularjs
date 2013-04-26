'use strict';
/**
* @file Controllers file of AngularJS application.
* @author Iļja Gubins <ilja.gubins@exigenservices.com>
*/

/**
* Controller used for logging in the system. Used with view login.html.
* Parameters are dependency injected.
* @function loginController
* @param $http Used for handling XHR requests.
* @param $rootScope Used for global vars.
* @param $scope Used for data manipulation.
* @param $location Used for handing redirecting.
* @param localStorageService Used for working with session params.
*/
function loginController($scope, $http, $rootScope, $location, localStorageService) {

  //focusing on inputName input box for easier navigation
  $('#inputName').focus();

  //login function
  $scope.login = function() {
    //ID doesn't have to be unique, but it's mandatory for using API, so it was decided to use current time
    //as an identification for requests
    $rootScope.auth_id = Date.now();
    localStorageService.add('auth_id', $rootScope.auth_id); //saving this ID for session restoration

    //login request
    $http.post(api_url, {
      "jsonrpc": "2.0",
      "method": "user.login",
      auth: $rootScope.auth,
      "params": {
        "user": $scope.inputName,
        "password": $scope.inputPassword //TODO - encryption. Will require server side modification too.
      },
      "id": $rootScope.auth_id
    }).success(function(data) {
      if (data.error) {

        //unsuccessful login
        $scope.error = data.error; //for showing responsed error
        $('#inputName').focus(); //restoring focus

      } else {

        //successful login
        localStorageService.add('auth', data.result); //saving auth key for session restoration

        $rootScope.auth = data.result;
        $rootScope.loggedIn = true;

        //getting list of monitored servers for autocompletion in search box
        $http.post(api_url, {
          jsonrpc: "2.0",
          id: $rootScope.auth_id,
          auth: $rootScope.auth,
          method: 'host.get',
          params: {
            output: ['name'],
            sortfield: 'name'
          }
        }).success(function(data) {
          $rootScope.serversOnline = data.result;
          //when done redirects you to main page
          $location.path('/');
        });

      }
    });
  };
}

/**
* Controller used for logging out of the system. Used with view logout.html.
* Parameters are dependency injected.
* @function logoutController
* @param $http Used for handling XHR requests.
* @param $rootScope Used for global vars.
* @param $location Used for handing redirecting.
* @param localStorageService Used for working with session params.
*/
function logoutController(localStorageService, $rootScope, $http, $location) {

  //should not be accessible for guests anyway
  //extra security just in case
  if (!$rootScope.loggedIn) {
    $location.path('/login');
  } else {
    $http.post(api_url, {
      jsonrpc: "2.0",
      id: $rootScope.auth_id,
      auth: $rootScope.auth,
      method: 'user.logout',
      params: {}
    }).success(function(data) {
      //closes current session
      $rootScope.loggedIn = false;
      $rootScope.auth = null;
      $rootScope.auth_id = null;

      //clearing cookies/localstorage
      localStorageService.clearAll();
      localStorageService.cookie.clearAll();

      //redirects to login page
      $location.path('/login');
    });
  }
}

/**
* Controller used for top menu. Used with view index.html -> #head -> .container-fluid.
* Parameters are dependency injected.
* @function menuController
* @param $rootScope Used for global vars.
* @param $scope Used for data manipulation.
* @param $location Used for handing redirecting.
*/
function menuController($scope, $location, $rootScope) {

  //mobile view
  //navbar collapsing back if clicked on any nav link
  $('.nav-collapse a').click(function(e) {
    if ($('#collapsingBtn').is(":visible")) {
      $('.nav-collapse').collapse('toggle');
    }
  });

  /**
  * Function used to initialize searching. Redirects user to /search/searchParams.
  * @function $scope.findServer()
  */
  $scope.findServer = function() {
    //redirects to search page with right parameters
    if ($scope.searchQuery) $location.path('/search/' + $scope.searchQuery);
    $scope.searchQuery = ""; //clears input box
  };
}

/**
* Controller used for zabbix overview (main page). Used with view overview.html.
* Parameters are dependency injected.
* @function overviewController
* @param $rootScope Used for global vars.
* @param $scope Used for data manipulation.
* @param $http Used for handling XHR requests.
* @param $q Used for handling promises.
*/
function overviewController($rootScope, $scope, $http, $q) {

  //should not be accessible for guests anyway
  //extra security just in case
  if ($rootScope.loggedIn) {

    //pluralization of error notifications on overview
    $scope.groupErrorsPluralize = {
      0: ' ',
      one: '{} error!',
      other: '{} errors!'
    };

    //severity of triggers
    $scope.triggerSeverity = ['Fine', 'Information', 'Warning', 'Average', 'High', 'Disaster'];

    //groups
    var groupsRequest = $http.post(api_url, {
        jsonrpc: "2.0",
        id: $rootScope.auth_id,
        auth: $rootScope.auth,
        method: 'hostgroup.get',
        params: {
          output: ['groupid', 'name'],
          sortfield: 'name',
          real_hosts: true
        },
        filter: {
          name: 'project'
        }
      }); //will work with request through $q
    var triggersRequest = $http.post(api_url, {
        jsonrpc: "2.0",
        id: $rootScope.auth_id,
        auth: $rootScope.auth,
        method: 'trigger.get',
        params: {
          selectGroups: 'refer',
          expandDescription: true,
          expandData: true,
          only_true: true,
          sortfield: 'lastchange',
          filter: {
            "value": 1
          },
          skipDependent: true,
          monitored: true,
          output: ['triggerid', 'priority', 'lastchange', 'description']
        }
      }).success(function (data) {
        for(var i=0; i<data.result.length; i++) {
          data.result[i].lastchange_words = dateConverter(data.result[i].lastchange);
        }
      });

      //TODO: add auto update feature to overview

    //$q is internal kriskowal's Q library implementation
    //it provides API to work with promises
    $q.all([groupsRequest, triggersRequest]).then(function (data) {
      //making new vars for readability
      var groupsData = data[0].data.result;
      var triggerData = data[1].data.result;
      var triggerDetails = {};

      function initializeData(groupsData) { //adding needed fields to groupsData object
        var deferred = $q.defer();
        for (var i = groupsData.length - 1; i >= 0; i--) {
          groupsData[i].lastchange = 0;
          groupsData[i].lastchange_words = "";
          groupsData[i].errors = 0;
          groupsData[i].errors_level = 0;
          triggerDetails[groupsData[i].groupid] = [];
        };
        deferred.resolve(); //promise used to ensure that data first will be initialized
        return deferred.promise;
      }


      //TODO PRIORITY
      //in current version, every unique trigger is expected to be in one hostgroup, not many
      //happens shit like ace-dbsrv01 has problems and it's shown in ACE Project group, but not
      //in ACE-DB.

      var promise = initializeData(groupsData);
      promise.then(function() {
        for (var i=0; i<groupsData.length; i++) {
          for (var j=0; j<triggerData.length; j++) {

            if (triggerData[j].groups[0].groupid === groupsData[i].groupid) {
            //if this trigger is related to this hostgroup
              groupsData[i].errors += 1; //increase errors count
              triggerDetails[groupsData[i].groupid].push(triggerData[j]);
              //triggerDetails is an object for storing related triggers

              if (triggerData[j].lastchange > groupsData[i].lastchange) {
                //time of the last issue
                groupsData[i].lastchange = triggerData[j].lastchange;
                groupsData[i].lastchange_words = dateConverter(triggerData[j].lastchange);
                //we also convert timestamp to readable format
              }
              if (triggerData[j].priority > groupsData[i].errors_level) {
                //storing the level of the highest error in this hostgroup
                groupsData[i].errors_level = triggerData[j].priority;
              }
            }
          }
        }
        //return back to $scope
        $scope.serverGroups = groupsData;
        $scope.triggerDetails = triggerDetails;
      });
    });
  }
}

/**
* Controller used for overview of all servers in the system. Used with view servers.html.
* Parameters are dependency injected.
* @function serversController
* @param $rootScope Used for global vars.
* @param $scope Used for data manipulation.
* @param $http Used for handling XHR requests.
* @param $routeParams Used for requesting URL parameters.
*/
function serversController($rootScope, $scope, $http, $routeParams) {

  if ($rootScope.loggedIn) {
    //getting all hosts available
    $http.post(api_url, {
      jsonrpc: "2.0",
      id: $rootScope.auth_id,
      auth: $rootScope.auth,
      method: 'host.get',
      params: {
        //selectTriggers: ['only_true'],
        monitored_hosts: true,
        output: ['name', 'available', 'hostid', 'host'] //todo
      }
    }).success(function(data) {
      $scope.hostsData = data.result;
    });
  }

  //focusing on filterInput input box for easier searching
  $('#filterInput').focus();
}

/**
* Controller used for detail overview of specific server. Used with view serverDetails.html.
* Parameters are dependency injected.
* @function serversDetailsController
* @param $rootScope Used for global vars.
* @param $scope Used for data manipulation.
* @param $http Used for handling XHR requests.
* @param $routeParams Used for requesting URL parameters.
* @param $location Used for handing redirecting.
*/
function serversDetailsController($rootScope, $scope, $http, $routeParams, $location) {

    //redirects back to main page if user comes to this url with serverId
    if (!$routeParams.serverId) {
      $location.path('/');
    }

    if ($rootScope.loggedIn) {
      //host info
      $http.post(api_url, {
        jsonrpc: '2.0',
        id: $rootScope.auth_id,
        auth: $rootScope.auth,
        method: 'host.get',
        params: {
          selectInventory: true,
          selectItems: ['name','lastvalue','units','itemid','lastclock'],
          output: 'extend',
          hostids: $routeParams.serverId
        }
      }).success(function (data) {
        $scope.inventoryData = data.result[0].inventory;
        $scope.serverName = data.result[0].name;
        $scope.zabbix_url = zabbix_url;
        $scope.hostId = $routeParams.serverId;
        if ($scope.itemsData = data.result[0].items) {
          for (var i = $scope.itemsData.length - 1; i >= 0; i--) {
            $scope.itemsData[i].lastclock = dateConverter($scope.itemsData[i].lastclock, "time");
          };
        }
        
      });
    }
}

/**
* Controller used for all server of one project overview. Used with view project.html.
* Parameters are dependency injected.
* @function projectController
* @param $rootScope Used for global vars.
* @param $scope Used for data manipulation.
* @param $http Used for handling XHR requests.
* @param $routeParams Used for requesting URL parameters.
* @param $location Used for handing redirecting.
*/
function projectController($rootScope, $scope, $http, $routeParams, $location) {

  //redirects back to main page if user comes to this url without projectId
  if (!$routeParams.projectId) {
    $location.path('/');
  }

  //shows all servers monitored in one hostgroup/project
  if ($rootScope.loggedIn) {
    $http.post(api_url, {
      jsonrpc: "2.0",
      id: $rootScope.auth_id,
      method: 'hostgroup.get',
      auth: $rootScope.auth,
      params: {
        groupids: $routeParams.projectId,
        output: ['groupid', 'name'],
        sortfield: 'name',
        selectHosts: ['hostid', 'available', 'host', 'status', 'name'],
        real_hosts: true,
        monitored_hosts: true
      }
    }).success(function (data, $timeout, $location) {
      $scope.hostgroupData = data.result[0];
    });
  }

  //focusing on filterInput input box for easier searching
  $('#filterInput').focus();
}

/**
* Controller used for dashboard. Used with view dashboard.html.
* Parameters are dependency injected.
* @function dashboardController
* @param $rootScope Used for global vars.
* @param $scope Used for data manipulation.
* @param $http Used for handling XHR requests.
* @param localStorageService Used for working with session params.
* @param $location Used for handing redirecting.
* @param $q Used for handling promises.
*/
function dashboardController($scope, $http, $rootScope, $location, localStorageService, $q) {

  //variables
  $rootScope.fullscreen = 'padding-left:2px; padding-right:2px;'; //making dashboard wider
  $scope.selectedGroups = {};
  var firstTime = true,
    groupSelectorShown = true;

  //getting active hostgroups and their hosts
  (function bar() {

    //stop this function execution after leaving dashboard
    if ($location.path() != '/dashboard') {
      // console.log('stopping bar()');
      $rootScope.fullscreen = '';
      return;
    }

    var hostgroupsRequest = $http.post(api_url, {
      jsonrpc: '2.0',
      id: $rootScope.auth_id,
      auth: $rootScope.auth,
      method: 'hostgroup.get',
      params: {
        real_hosts: true,
        monitored_hosts: true,
        output: ['groupid', 'name'],
        selectHosts: ['hostid', 'available', 'name', 'host', 'status'],
        sortfield: 'name'
      }
      }).success(function (data) {
        $scope.hostgroupsData = data.result;
        if (localStorageService.get('selectedGroups') === null) {
          //user doesn't have memory of this place
          for (var i = data.result.length - 1; i >= 0; i--) {
            $scope.selectedGroups[data.result[i].groupid] = true; //selecting everything
            localStorageService.add('selectedGroups', JSON.stringify($scope.selectedGroups));
            //saving everything TODO: promise? kazhdij raz ne nuzhno .add, nuzhno tolko odin raz v konce
          }
        } else {
          //otherwise parse stringified object from localstorage
          $scope.selectedGroups = JSON.parse(localStorageService.get('selectedGroups'));
        }
      });

    setTimeout(bar, hostgroupUpdateInterval); //hostgroupUpdateInterval defined at the top
    //it is not intended for hostgroups to be added/removed frequently hence the big interval
  })();

  //getting current active triggers
  (function foo() {

    //stop this function execution after leaving dashboard
    if ($location.path() != '/dashboard') {
      // console.log('stopping foo()'); //debugging
      $rootScope.fullscreen = '';
      return;
    }

    var triggersRequest = $http.post(api_url, {
      jsonrpc: '2.0',
      id: $rootScope.auth_id,
      auth: $rootScope.auth,
      method: 'trigger.get',
      params: {
        expandDescription: true, //transform macros to readable text
        expandData: true, //transform macros to readable text
        sortfield: 'priority',
        selectGroups: 'refer', //needed to show/hide triggers only that are in selected groups
        selectHosts: 'refer',
        filter: {
          value: 1
        },
        skipDependent: true,
        monitored: true,
        only_true: true,
        output: ['description', 'lastchange', 'priority', 'triggerid']
      }
      }).success(function (data) {
        $scope.triggersData = data.result;

        //showing last updated time for usability
        $scope.lastUpdated = timeConverter(new Date().getTime());

        //TODO bug fix
        //sometimes colors and tooltips are not being assigned

        //if it's first time then we should wait for servers grid finished rendenring
        //unfortunately listener then works when we refresh hostgroup list
        //that's why we need to recheck if it's firstTime again inside it
        if (firstTime) {
          $scope.$on('serversRenderingFinished', function() {
            if (!firstTime) {
              return;
            } else {
              if (removePrevTooltips(data.result, 'firstTime')) {
                tooltipsHover(data.result, 'firstTime');
              }
              firstTime = false; //boolean flag
            }
          });
        } else {
            if (removePrevTooltips(data.result, 'NOT firstTime')) {
              tooltipsHover(data.result, 'NOT firstTime');
            }
        }

        //when triggers divs are successfully rendered attaching hover event
        $scope.$on('triggersRenderingFinished', function() {
          //on hover on notifications highlight zoom the appropriate .server div
          $('div[id^="notification-"]').hover(
            function () {
              $('#'+$(this).attr('id').substring(13)).
              addClass('zoomUp'); //200% zoom, check style.css for details
            },
            function () {
              $('#'+$(this).attr('id').substring(13)).
              removeClass('zoomUp'); //removing zoom, back to 100%
            }
          );
        });

      });

    setTimeout(foo, triggerUpdateInterval);
  })();

  //remove old tooltips
  function removePrevTooltips(triggersData, whereFrom) {
    $('.server').tooltip('destroy').removeClass('error1 error2 error3 error4 error5');
    return true;
  }

  //add new tooltips
  function tooltipsHover(triggersData, whereFrom) {
    for (var i = triggersData.length - 1; i >= 0; i--) {
        $('#'+triggersData[i].hosts[0].hostid).tooltip({title: triggersData[i].description})
          .addClass('error'+triggersData[i].priority);
    }
  }

  //function for selecting groups visible on dashboard via group selector
  $scope.selectGroup = function (groupId) {
    if ($scope.selectedGroups[groupId] === true) { //group was selected
      $scope.selectedGroups[groupId] = false; //not anymore
      localStorageService.add('selectedGroups', JSON.stringify($scope.selectedGroups));
      //writing down this change in localStorage/cookies
    } else {
      $scope.selectedGroups[groupId] = true;
      localStorageService.add('selectedGroups', JSON.stringify($scope.selectedGroups));
    }
  }

  //show/hide group selector
  $scope.toggleGroupSelector = function() {
    $('#groups').animate({height:'toggle'}, 'slow'); //beautifully hiding it
    if (groupSelectorShown) {
      groupSelectorShown = false;
      $scope.groupSelectorShown = 'Show';
    } else {
      groupSelectorShown = true;
      $scope.groupSelectorShown = 'Hide';
    }
  }
}


/**
* Controller used for search of servers and groups in the system. Used with view search.html.
* Parameters are dependency injected.
* @function searchController
* @param $rootScope Used for global vars.
* @param $scope Used for data manipulation.
* @param $http Used for handling XHR requests.
* @param $routeParams Used for requesting URL parameters.
* @param $location Used for handing redirecting.
*/
function searchController($rootScope, $scope, $http, $routeParams, $location) {

  $scope.searchPhrase = $routeParams.searchString;

  //if users enters url without search string
  //redirect him to the first page
  if (!$routeParams.searchString) {
    $location.path('/');
  }

  $("#serverSearch").blur(); //usability

  if ($rootScope.loggedIn) {

    //if users enters correct name of server, redirects to the page of server
    for (var i = $rootScope.serversOnline.length - 1; i >= 0; i--) {
      if ($rootScope.serversOnline[i].name == $routeParams.searchString) {
        $location.path('/servers/' + $rootScope.serversOnline[i].hostid);
      }
    };

    //host and hostgroup search query are async
    //getting hosts
    $http.post(api_url, {
      jsonrpc: "2.0",
      id: $rootScope.auth_id,
      method: 'host.get',
      auth: $rootScope.auth,
      params: {
        monitored_hosts: true,
        output: ['name', 'hostid'],
        search: {
          name: $routeParams.searchString
        },
        sortfield: 'name'
      }
      }).success(function(data) {
        $scope.hostsData = data.result;
      });

    //getting hostgroups
    $http.post(api_url, {
      jsonrpc: "2.0",
      id: $rootScope.auth_id,
      method: 'hostgroup.get',
      auth: $rootScope.auth,
      params: {
        output: ['groupid', 'name'],
        sortfield: 'name',
        real_hosts: true,
        search: {
          name: $routeParams.searchString
        }
      }
      }).success(function(data) {
        $scope.groupsData = data.result;
      });

  }
}