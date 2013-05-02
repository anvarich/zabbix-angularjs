'use strict';
angular.module('myTestModule', []);

describe('Zabbix Frontend', function() {

  describe('trying to access controllers without authentication', function() {

    it('it should redirect you to login page and not show main page', function() {
      browser().navigateTo('/');
      expect(browser().location().url()).toBe('/login');
    });

    //check for access to other controllers without authorization
    it('it should automatically redirect to /login/ from /overview/ without auth', function() {
      browser().navigateTo('/#/overview/');
      expect(browser().location().url()).toBe('/login');
    });

    it('it should automatically redirect to /login/ from /servers/ without auth', function() {
      browser().navigateTo('/#/servers/');
      expect(browser().location().url()).toBe('/login');
    });

    it('it should automatically redirect to /login/ from /project/ without auth', function() {
      browser().navigateTo('/#/project');
      expect(browser().location().url()).toBe('/login');
    });

    it('it should automatically redirect to /login/ from /dashboard/ without auth', function() {
      browser().navigateTo('/#/dashboard/');
      expect(browser().location().url()).toBe('/login');
    });

     it('it should automatically redirect to /login/ from /search/ without auth', function() {
      browser().navigateTo('/#/search');
      expect(browser().location().url()).toBe('/login');
    });

  });

  describe('logging in', function() {

    beforeEach(function() {
      browser().navigateTo('/');
    });

    it('it should not login without entering password', function() {
      input('inputName').enter('totallyFakeAndNotRealUsername');
      expect(element('input.ng-invalid.ng-invalid-required', 'Helper Password').count()).toBe(1);
    });

    it('it should not login without entering username', function() {
      input('inputPassword').enter('totallyFakeAndNotRealPassword');
      expect(element('input.ng-invalid.ng-invalid-required', 'Helper Username').count()).toBe(1);
    });

    it('it should not login with bad username and password', function() {
      input('inputName').enter('totallyFakeAndNotRealUsername');
      input('inputPassword').enter('totallyFakeAndNotRealPassword');
      element('button.btn').click();
      expect(element('span.help-block', 'Error Span Helper').text()).toEqual('Login name or password is incorrect.');
    });

  });

});