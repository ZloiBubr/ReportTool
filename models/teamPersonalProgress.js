/**
 * Created by Gerd on 24.05.2014.
 */
exports.TeamPersonalProgress = function () {
    // Example for Model Start here ------------------------------------------------------------------//
    this.teams = [
        {
            name: "Nova",
            developers: [
                {
                    name: "Heorhi vilkitsi",
                    totalSP: 20,
                    totalHR: 40,
                    avgSP: 0,
                    avgSPinHour: 0,
                    avgSPOnAllDays: 0,
                    progressDetails: [
                        {
                            date: new Date(2014, 5, 11),
                            totalSP: 2,
                            totalHR: 5,
                            pages: [
                                {
                                    pageId: "PLEXUXC-2003",
                                    SP: 2,
                                    HR: 4
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ];

    this.startDate = new Date(2014, 5, 10);
    this.endDate = new Date(2014, 5, 24);

    // Example for Model End here ------------------------------------------------------------------//

    // clear example data
    this.teams = [];
    this.startDate = new Date();
    this.endDate = new Date();
}

exports.Team =  function(name){
    this.name = name;
    this.developers = [];
};

exports.Developer =  function(name){
    this.name = name;
    this.totalSP = 0;
    this.totalHR = 0;
    this.avgSP = 0;
    this.avgSPinHour = 0;
    this.avgSPOnAllDays = 0;
    this.progressDetails = [];
};

exports.ProgressDetail =  function(date){
    this.date = date;
    this.totalSP = 0;
    this.totalHR = 0;
    this.pages = [];
};

exports.Page =  function(pageId, HR, SP){
    this.pageId = pageId;
    this.SP = SP || 0;
    this.HR = HR || 0;
};