sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'salesorder/test/integration/FirstJourney',
		'salesorder/test/integration/pages/salesorderList',
		'salesorder/test/integration/pages/salesorderObjectPage'
    ],
    function(JourneyRunner, opaJourney, salesorderList, salesorderObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('salesorder') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onThesalesorderList: salesorderList,
					onThesalesorderObjectPage: salesorderObjectPage
                }
            },
            opaJourney.run
        );
    }
);