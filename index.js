// 引入 guapack 文件
const pack = require('./static/js/lib/pack')
// 引入配置文件
const config = require('./pack.config')
console.log('config', config)

const __main = () => {
    let entry = require.resolve(config.entry)
    // console.log('entry', entry)
    pack(entry, config)
}

if (require.main === module) {
    __main()
}