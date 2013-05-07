/*! angular 2013-05-07 */
"use strict";function loginController($scope,$http,$rootScope,$location,localStorageService){$("#inputName").focus(),$scope.login=function(){$rootScope.auth_id=Date.now(),localStorageService.add("auth_id",$rootScope.auth_id),$http.post(api_url,{jsonrpc:"2.0",method:"user.login",auth:$rootScope.auth,params:{user:$scope.inputName,password:$scope.inputPassword},id:$rootScope.auth_id}).success(function(data){data.error?($scope.error=data.error,$("#inputName").focus()):(localStorageService.add("auth",data.result),$rootScope.auth=data.result,$rootScope.loggedIn=!0,$scope.inputName="",$scope.inputPassword="",$("#inputName").focus(),$http.post(api_url,{jsonrpc:"2.0",id:$rootScope.auth_id,auth:$rootScope.auth,method:"host.get",params:{output:["name"],sortfield:"name"}}).success(function(data){$rootScope.serversOnline=data.result,$location.path("/")}))})}}function logoutController(localStorageService,$rootScope,$http,$location){$rootScope.loggedIn&&$http.post(api_url,{jsonrpc:"2.0",id:$rootScope.auth_id,auth:$rootScope.auth,method:"user.logout",params:{}}).success(function(){$rootScope.loggedIn=!1,$rootScope.auth=null,$rootScope.auth_id=null,localStorageService.clearAll(),$location.path("/login")})}function menuController($scope,$location){$(".nav-collapse a").click(function(){$("#collapsingBtn").is(":visible")&&$(".nav-collapse").collapse("toggle")}),$scope.findServer=function(){$scope.searchQuery&&$location.path("/search/"+$scope.searchQuery),$scope.searchQuery=""}}function overviewController($rootScope,$scope,$http,$q){if($rootScope.loggedIn){$scope.groupErrorsPluralize={0:" ",one:"{} error!",other:"{} errors!"},$scope.triggerSeverity=["Fine","Information","Warning","Average","High","Disaster"];var groupsRequest=$http.post(api_url,{jsonrpc:"2.0",id:$rootScope.auth_id,auth:$rootScope.auth,method:"hostgroup.get",params:{output:["groupid","name"],sortfield:"name",real_hosts:!0},filter:{name:"project"}}),triggersRequest=$http.post(api_url,{jsonrpc:"2.0",id:$rootScope.auth_id,auth:$rootScope.auth,method:"trigger.get",params:{selectGroups:"refer",expandDescription:!0,expandData:!0,only_true:!0,sortfield:"lastchange",filter:{value:1},skipDependent:!0,monitored:!0,output:["triggerid","priority","lastchange","description"]}}).success(function(data){for(var i=0;data.result.length>i;i++)data.result[i].lastchange_words=dateConverter(data.result[i].lastchange)});$q.all([groupsRequest,triggersRequest]).then(function(data){function initializeData(groupsData){for(var deferred=$q.defer(),i=groupsData.length-1;i>=0;i--)groupsData[i].lastchange=0,groupsData[i].lastchange_words="",groupsData[i].errors=0,groupsData[i].errors_level=0,triggerDetails[groupsData[i].groupid]=[];return deferred.resolve(),deferred.promise}var groupsData=data[0].data.result,triggerData=data[1].data.result,triggerDetails={},promise=initializeData(groupsData);promise.then(function(){for(var i=0;groupsData.length>i;i++)for(var j=0;triggerData.length>j;j++)triggerData[j].groups[0].groupid===groupsData[i].groupid&&(groupsData[i].errors+=1,triggerDetails[groupsData[i].groupid].push(triggerData[j]),triggerData[j].lastchange>groupsData[i].lastchange&&(groupsData[i].lastchange=triggerData[j].lastchange,groupsData[i].lastchange_words=dateConverter(triggerData[j].lastchange)),triggerData[j].priority>groupsData[i].errors_level&&(groupsData[i].errors_level=triggerData[j].priority));$scope.serverGroups=groupsData,$scope.triggerDetails=triggerDetails})})}}function serversController($rootScope,$scope,$http){$rootScope.loggedIn&&$http.post(api_url,{jsonrpc:"2.0",id:$rootScope.auth_id,auth:$rootScope.auth,method:"host.get",params:{monitored_hosts:!0,output:["name","available","hostid","host"]}}).success(function(data){$scope.hostsData=data.result}),$("#filterInput").focus()}function serversDetailsController($rootScope,$scope,$http,$routeParams,$location){$rootScope.loggedIn&&($routeParams.serverId||$location.path("/"),$http.post(api_url,{jsonrpc:"2.0",id:$rootScope.auth_id,auth:$rootScope.auth,method:"host.get",params:{selectInventory:!0,selectItems:["name","lastvalue","units","itemid","lastclock","value_type","itemid"],output:"extend",hostids:$routeParams.serverId}}).success(function(data){if($scope.inventoryData=data.result[0].inventory,$scope.serverName=data.result[0].name,$scope.zabbix_url=zabbix_url,$scope.hostId=$routeParams.serverId,$scope.itemsData=data.result[0].items)for(var i=$scope.itemsData.length-1;i>=0;i--)$scope.itemsData[i].lastclock=dateConverter($scope.itemsData[i].lastclock,"time")}))}function projectController($rootScope,$scope,$http,$routeParams,$location){$rootScope.loggedIn&&($routeParams.projectId||$location.path("/"),$http.post(api_url,{jsonrpc:"2.0",id:$rootScope.auth_id,method:"hostgroup.get",auth:$rootScope.auth,params:{groupids:$routeParams.projectId,output:["groupid","name"],sortfield:"name",selectHosts:["hostid","available","host","status","name"],real_hosts:!0,monitored_hosts:!0}}).success(function(data){$scope.hostgroupData=data.result[0]})),$("#filterInput").focus()}function dashboardController($scope,$http,$rootScope,$location,localStorageService){function removePrevTooltips(){return $(".server").tooltip("destroy").removeClass("error1 error2 error3 error4 error5"),!0}function tooltipsHover(triggersData){for(var i=triggersData.length-1;i>=0;i--)$("#"+triggersData[i].hosts[0].hostid).tooltip({title:triggersData[i].description}).addClass("error"+triggersData[i].priority)}$rootScope.fullscreen="padding-left:2px; padding-right:2px;",$scope.selectedGroups={};var firstTime=!0,groupSelectorShown=!0;(function bar(){return"/dashboard"!==$location.path()?($rootScope.fullscreen="",void 0):($http.post(api_url,{jsonrpc:"2.0",id:$rootScope.auth_id,auth:$rootScope.auth,method:"hostgroup.get",params:{real_hosts:!0,monitored_hosts:!0,output:["groupid","name"],selectHosts:["hostid","available","name","host","status"],sortfield:"name"}}).success(function(data){if($scope.hostgroupsData=data.result,null===localStorageService.get("selectedGroups"))for(var i=data.result.length-1;i>=0;i--)$scope.selectedGroups[data.result[i].groupid]=!0,localStorageService.add("selectedGroups",JSON.stringify($scope.selectedGroups));else $scope.selectedGroups=JSON.parse(localStorageService.get("selectedGroups"))}),setTimeout(bar,hostgroupUpdateInterval),void 0)})(),function foo(){return"/dashboard"!==$location.path()?($rootScope.fullscreen="",void 0):($http.post(api_url,{jsonrpc:"2.0",id:$rootScope.auth_id,auth:$rootScope.auth,method:"trigger.get",params:{expandDescription:!0,expandData:!0,sortfield:"priority",selectGroups:"refer",selectHosts:"refer",filter:{value:1},skipDependent:!0,monitored:!0,only_true:!0,output:["description","lastchange","priority","triggerid"]}}).success(function(data){$scope.triggersData=data.result,$scope.lastUpdated=timeConverter((new Date).getTime()),firstTime?$scope.$on("serversRenderingFinished",function(){firstTime&&(removePrevTooltips(data.result,"firstTime")&&tooltipsHover(data.result,"firstTime"),firstTime=!1)}):removePrevTooltips(data.result,"NOT firstTime")&&tooltipsHover(data.result,"NOT firstTime"),$scope.$on("triggersRenderingFinished",function(){$('div[id^="notification-"]').hover(function(){$("#"+$(this).attr("id").substring(13)).addClass("zoomUp")},function(){$("#"+$(this).attr("id").substring(13)).removeClass("zoomUp")})})}),setTimeout(foo,triggerUpdateInterval),void 0)}(),$scope.selectGroup=function(groupId){$scope.selectedGroups[groupId]===!0?($scope.selectedGroups[groupId]=!1,localStorageService.add("selectedGroups",JSON.stringify($scope.selectedGroups))):($scope.selectedGroups[groupId]=!0,localStorageService.add("selectedGroups",JSON.stringify($scope.selectedGroups)))},$scope.toggleGroupSelector=function(){$("#groups").animate({height:"toggle"},"slow"),groupSelectorShown?(groupSelectorShown=!1,$scope.groupSelectorShown="Show"):(groupSelectorShown=!0,$scope.groupSelectorShown="Hide")}}function searchController($rootScope,$scope,$http,$routeParams,$location){if($scope.searchPhrase=$routeParams.searchString,$routeParams.searchString||$location.path("/"),$("#serverSearch").blur(),$rootScope.loggedIn){if($rootScope.serversOnline&&$rootScope.serversOnline.length)for(var i=$rootScope.serversOnline.length-1;i>=0;i--)$rootScope.serversOnline[i].name===$routeParams.searchString&&$location.path("/servers/"+$rootScope.serversOnline[i].hostid);$http.post(api_url,{jsonrpc:"2.0",id:$rootScope.auth_id,method:"host.get",auth:$rootScope.auth,params:{monitored_hosts:!0,output:["name","hostid"],search:{name:$routeParams.searchString},sortfield:"name"}}).success(function(data){$scope.hostsData=data.result}),$http.post(api_url,{jsonrpc:"2.0",id:$rootScope.auth_id,method:"hostgroup.get",auth:$rootScope.auth,params:{output:["groupid","name"],sortfield:"name",real_hosts:!0,search:{name:$routeParams.searchString}}}).success(function(data){$scope.groupsData=data.result})}}