var offsets = require("../generated/offsets");

module.exports = (function() {
    
    function offsetOf(timezone){
        var offset = offsets[timezone];
        if(offset != undefined && offset != null){
            return offset;
        } else {
            throw Error("Invalid timezone "+ timezone);
        }
    }

    function removeOffset(date){
        var currentOffset = date.getTimezoneOffset() * -60000;
        return date.getTime() - currentOffset;
    }

    function timeAt(date, timezone){
        let timeUtc = removeOffset(date);
        var offset = offsetOf(timezone) * -60000;
        return new Date(timeUtc + offset);
    }

    return {
        offsetOf: offsetOf,
        removeOffset: removeOffset,
        timeAt: timeAt
    };
})();