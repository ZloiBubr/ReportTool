function Teams() {
    this.teams = [
        {
            id: "TeamRenaissance",
            name: "Renaissance",
            streams: ["StreamR1", "StreamR2", "StreamR3"],
            teamLead: "Aliaksandr Koush",
            qaTeamLead: "Aliaksandra Kutynka",
            developers: [
                "Andrei Osipau2",
                "Dzianis Arlouski",
                "Siarhei Tkachenka",
                "Iryna Kucharenka1",
                "Ivan Izmer",
                "Mark Varabyou",
                "Raman But-Husaim",
                "Siarhei Abrazhevich",
                "Artsiom Rusak",
                "Raman Ivanou",
                "Aliaksandr Koush",
                "Nicolay Kostroma",
                "Valentina Napolnova",
                "Aliaksey Rahatka",
                "Pavel Kastsiuk",
                "Juliana Stolnik",
                "Artsiom Kazlou"
            ],
            testers: [
                "Pavel Vysotsky",
                "Viktoriya Harbatsenkava",
                "Hanna Prykhodzka",
                "Kseniya Kavalchuk",
                "Yuliya Tukaila",
                "Aliaksandra Kutynka"
            ]
        },
        {
            id: "TeamInspiration",
            name: "Inspiration",
            streams: ["StreamIn1", "StreamIn2", "StreamIn3"],
            teamLead: "Sergey Tischenko",
            qaTeamLead: "Denys Pugachov",
            developers: [
                "Borys Roshal",
                "Denys Poliakov",
                "Kostiantyn Lazurenko",
                "Oleksandr Stukalov",
                "Oleksii Bespalko",
                "Yevhenii Havryliuk",
                "Yuriy Shestyora",
                "Ihor Bershov",
                "Vladyslav Pilhui",
                "Oleksandr Zhyltsov",
                "Oleksii Suriadnyi",
                "Roman Golovchenko",
                "Serhiy Haponenko",
                "Yevhenii Lomov"
            ],
            testers: [
                "Mila Botnar",
                "Yuri Timchenko",
                "Anastasia Kotenyova",
                "Pavlo Golovashchenko",
                "Svitlana Peleshenko",
                "Denys Pugachov"
            ]
        },
        {
            id: "TeamNova",
            name: "Nova",
            streams: ["StreamN1", "StreamN2", "StreamN3"],
            teamLead: "Heorhi Vilkitski",
            qaTeamLead: "Valiantsina Krautsevich",
            developers: [
                "Andrei Kandybovich",
                "Dzmitry Siamchonak",
                "Mikita Stalpinski",
                "Uladzimir Harabtsou",
                "Aliaksandr Nikulin",
                "Ilya Kazlou1",
                "Katsiaryna Kaliukhovich",
                "Vadzim Vysotski",
                "Edhar Liashok",
                "Raman Prakofyeu",
                "Ruslan Khilmanovich",
                "Anton Kratenok",
                "Siarhei Maksimau1",
                "Dzmitry Chapurok",
                "Evgeny Sinitsyn",
                "Dzmitry Salodki"
            ],
            testers: [
                "Aliaksei Burnosenka",
                "Viktar Mikalayenka",
                "Eugeny Okulik",
                "Yuliya Kalasouskaya",
                "Hanna Maskalenka",
                "Valiantsina Krautsevich"
            ]
        },
        {
            id: "TeamLiberty",
            name: "Liberty",
            streams: ["StreamL1", "StreamL2", "StreamL3"],
            teamLead: "Dzmitry Tabolich",
            qaTeamLead: "Iryna Kutsko",
            developers: [
                "Pavel Naumenka",
                "Sergei Kulick",
                "Volha Shandrokha",
                "Aliaksandr Rusak",
                "Andrei Kasak",
                "Andrei Krasnou",
                "Pavel Krakasevich",
                "Stepan Zelenin",
                "Dzmitry Isachenka",
                "Eugen Surovets",
                "Katsiaryna Tsalabanava",
                "Kate Tsalabanava",
                "Vitali Podobed",
                "Hleb Krotsik",
                "Uladzimir Vysotski"

            ],
            testers: [
                "Anna Novikova",
                "Anton Rapinchuk",
                "Igor Andros",
                "Maria Sobal",
                "Yuliya Karnatsevich",
                "Iryna Kutsko",
                "Natalya Krestelyova"
            ]
        },
        {
            id: "TeamViva",
            name: "Viva",
            streams: ["StreamV1", "StreamV2", "StreamV3"],
            teamLead: "Valentine Zhuck",
            qaTeamLead: "Katsiaryna Kuchko",
            developers: [
                "Valentine Zhuck",
                "Maryna Furman",
                "Siarhei Zhalezka",
                "Viachaslau Anufryiuk",
                "Yury Yamoryk",
                "Aliaksandr Kladau",
                "Dzmitry Kavaliou",
                "Dzmitry Shynkarou",
                "Maksim Tsikhan",
                "Petr Falitarchyk",
                "Yuri Chupyrkin",
                "Aliaksandr Rykau",
                "Ivan Dziameshka",
                "Siarhei Bahdanovich",
                "Andrei Lysenka",
                "Aleh Dukel",
                "Ivan Yanchuk"
            ],
            testers: [
                "Iryna Koush",
                "Maryia Kireyeva",
                "Iryna Shuliak",
                "Liudmila Barshcheuskaya",
                "Iryna Razorionova",
                "Katsiaryna Kuchko"
            ]
        },
        {
            id: "TeamAutomation",
            name: "Automation",
            teamLead: "Aliaksandr Basau",
            developers: [
                "Nadzeya Mishurava",
                "Viachaslau Naimovich",
                "Vitali Sonchyk",
                "Katsiaryna Firsava",
                "Katsiaryna Kulbitskaya",
                "Maryia Kashtanava",
                "Rustam Allanazarau"
            ]
        }
    ]
}

exports.AllTeams = new Teams();

exports.OldDevelopers = function oldDevelopers(name) {
    if(name == 'Valentine Zhuck' ||
        name == 'Dzmitry Tabolich' ||
        name == 'Heorhi Vilkitski' ||
        name == "Hanna Kastsian" ||
        name == "Alena Charnova" ||
        name == "Aliaksei Astashkin" ||
        name == "yauheni_lohinau" ||
        name == "Dmytro Komar" ||
        name == "Aliaksei Labachou" ||
        name == "Mariya Babich" ||
        name == "Katsiaryna Sasina" ||
        name == "aliaksei_labachou aliaksei_labachou" ||
        name == undefined) {
        return true;
    }
    return false;
};
