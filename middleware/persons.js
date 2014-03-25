exports.isDeveloper = function(name) {
    switch(name){
        case "Pavel Vysotsky":
        case "Viktoriya Harbatsenkava":
        case "Hanna Prykhodzka":
        case "Kseniya Kavalchuk":
        case "Yuliya Tukaila":
        case "Aliaksandra Kutynka":
        case "Mila Botnar":
        case "Yuri Timchenko":
        case "Anastasia Kotenyova":
        case "Pavlo Golovashchenko":
        case "Svitlana Peleshenko":
        case "Denys Pugachov":
        case "Yuliya Kalasouskaya":
        case "Valiantsina Krautsevich":
            return "QA";
        case "Aliaksandr Basau":
        case "Julia Zhavnerchik":
        case "Nadzeya Mishurava":
        case "Stepan Zelenin":
        case "Viachaslau Naimovich":
        case "Vitali Sonchyk":
        case "Katsiaryna Firsava":
        case "Katsiaryna Kulbitskaya":
            return "Automation";
        default:
            return "Developer";
    }
}