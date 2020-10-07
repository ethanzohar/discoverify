require 'active_support/all'

zones = Hash.new
timezones = ActiveSupport::TimeZone.all.each { |tz| 
    zones[tz.tzinfo.name] = tz.utc_offset / 60 * -1
}

File.open("offsets.json", 'w') { |file| file.write(zones.to_json) }