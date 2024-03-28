const formatDate = (d = Date.now()) => {
    const date = new Date(d);
    const time = date.toLocaleTimeString();
    const [year, month, day] = date.toJSON().split("T")[0].split("-");

    return `${year}-${month}-${day} ${time}`;
};

const _log = (name, date, color, ...data) =>
    console.log(
        `\x1B[0m[${formatDate(date)}] \x1B[${color}m\x1B[1m[${name.toUpperCase()}] \x1B[0m-`,
        ...data
    );

module.exports = class Logger {
    static log(...data) {
        _log("info", Date.now(), 33, ...data);
    };

    static debug(...data) {
        _log("debug", Date.now(), 33, ...data);
    };
    
    static warn(...data) {
        _log("warning", Date.now(), 33, ...data);
    };
    
    static success(...data) {
        _log("success", Date.now(), 32, ...data);
    };
    
    static error(...data) {
        _log("error", Date.now(), 31, ...data);
    };
};
