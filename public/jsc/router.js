/**
 * Created by Heorhi_Vilkitski on 3/28/14.
 */

myApp.config(function($stateProvider, $urlRouterProvider) {
    //
    // For any unmatched url, redirect to /state1
    $urlRouterProvider.otherwise("/cumulative");
    //
    // Now set up the states
    $stateProvider
        .state('home', {
            url: "/cumulative",
            templateUrl: "pages/cumulative.html"
        })
        .state('dashboard', {
            url: "/dashboard",
            templateUrl: "../pages/dashboard/dashboard.html"
        })
        .state('weeklyVelocity', {
            url: "/weeklyVelocity",
            templateUrl: "pages/weeklyVelocity.html"
        })
        .state('pagesBySize', {
            url: "/pagesBySize",
            templateUrl: "pages/pagesBySize.html"
        })
        .state('normalizedHours', {
            url: "/normalizedHours",
            templateUrl: "pages/normalizedHours.html"
        })
        .state('progressTable', {
            url: "/progressTable",
            templateUrl: "pages/progressTable.html"
        })
        .state('timeSheet', {
            url: "/timeSheet",
            templateUrl: "pages/timeSheet.html"
        })
        .state('timeSheet2week', {
            url: "/timeSheet2week",
            templateUrl: "pages/timeSheet2week.html"
        })
        .state('waveProgress' , {
            url: "/waveProgress",
            templateUrl: "pages/waveProgress.html"
        })
        .state('moduleProgress' , {
            url: "/moduleProgress",
            templateUrl: "pages/moduleProgress.html"
        })
        .state('moduleTargets' , {
            url: "/moduleTargets",
            templateUrl: "pages/moduleTargets.html"
        })
        .state('updateFromJira', {
            url: "/updateFromJira",
            templateUrl: "pages/updateFromJira.html"
        })
        .state('updateJiraLabels', {
            url: "/updateJiraLabels",
            templateUrl: "pages/updateJiraLabels.html"
        })
        .state('page' , {
            url: "/page/:id",
            templateUrl: "pages/page.html"
        })

});