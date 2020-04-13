const fs = require('fs')
const path = require('path')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const { transformFromAstSync } = require('@babel/core')

const { log, gidGenerator, resolvePath } = require('./utils')

// let gid = 1

const astForCode = (code) => {
    let ast = parser.parse(code, {
        sourceType: 'module',
    })
    return ast
}

const codeForAst = (ast, sourceCode) => {
    let r = transformFromAstSync(ast, sourceCode, {
        // 转成 es5 代码的时候需要配置 presets
        presets: ['@babel/preset-env'],
    })
    return r.code
}

const moduleTemplate = (graph, mapping) => {
    let g = graph
    let m = JSON.stringify(mapping)
    let s = `
        ${g.id}: [
            function(require, module, exports) {
                ${g.code}
            },
            ${m}
        ],
    `
    return s
}

// 拿到依赖图之后, 还需要处理成模块
// 使用 iife 的方式来解决
const moduleFromGraph = (graph) => {
    let modules = ''
    Object.values(graph).forEach(g => {

        let ds = g.dependencies

        let o = {}
        // [[k1, v1], [k2, v2]]
        Object.entries(ds).forEach(([k, v]) => {
            o[k] = graph[v].id
        })

        log('graph o is', g)

        // module 几乎是一样的, 用一个模板函数来生成
        modules += moduleTemplate(g, o)
    })
    return modules
}

// 最后生成的 bundle 文件
const bundleTemplate = (module) => {
    let s = `
        (function(modules) {
            const require = (id) => {
                let [fn, mapping] = modules[id]

                const localRequire = (name) => {
                    return require(mapping[name])
                }

                const localModule = {
                    exports: {

                    }
                }

                fn(localRequire, localModule, localModule.exports)

                return localModule.exports
            }

            require(1)
        })({${module}})
    `
    return s
}

const saveBundle = (bundle, file) => {
    fs.writeFileSync(file, bundle)
}

// entry 作为起点, 先收集相关依赖
const collectedDeps = (entry) => {
    let s = fs.readFileSync(entry, 'utf8')
    let ast = astForCode(s)

    let l = []
    traverse(ast, {
        ImportDeclaration(path) {
            let module = path.node.source.value
            l.push(module)
        }
    })
    // log('l is', l)
    let o = {}
    l.forEach(e => {
        // 根据 entry 拿到 entry 所做的目录
        // 根据相对路径可以计算出绝对路径
        let directory = path.dirname(entry)
        let p = resolvePath(directory, e)

        // 返回相对路径和绝对路径
        o[e] = p
    })
    // log('o is', o)
    return o
}

const parsedEntry = (entry) => {
    let o = {}
    // 用 id 来标记每一个模块, 用 gidGenerator 来生成全局变量 id
    let id = gidGenerator()
    let ds = collectedDeps(entry)
    // 这里应该封装成函数
    let s = fs.readFileSync(entry, 'utf8')
    let ast = astForCode(s)

    // 浏览器不能直接处理 es6 的代码, 转成 es5 代码
    let es5Code = codeForAst(ast, s)


    o[entry] = {
        id: id,
        dependencies: ds,
        code: es5Code,
        content: s,
    }

    Object.values(ds).forEach(d => {
        // 遍历收集并且解析依赖
        let r = parsedEntry(d)
        // 返回值与初始值合并
        Object.assign(o, r)
    })

    // log('entry o', o)
    return o
}

const bundle = (entry, config) => {
    let graph = parsedEntry(entry)
    let module = moduleFromGraph(graph)
    let bundle = bundleTemplate(module)
    // let file = 'dist/bundle.js'
    let file = path.join(config.output.directory, config.output.filename)
    log('file', file)
    saveBundle(bundle, file)
}

module.exports = bundle
