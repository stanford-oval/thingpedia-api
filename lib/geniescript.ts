import DialogueHandler from "./dialogue-handler";
import CommandAnalysisResult = DialogueHandler.CommandAnalysisResult;
import ReplyResult = DialogueHandler.ReplyResult;
import { Type } from "thingtalk";

interface GeniescriptAnalysisResult extends DialogueHandler.CommandAnalysisResult {
    confident : DialogueHandler.Confidence;
    user_target : string;
    utterance : string;
    branch : string;
}

interface LogicParameter {
    type : LogicParameterType;
    content : string | GeniescriptAnalysisResult | DialogueHandler.CommandAnalysisResult;
}

enum LogicParameterType {
    ANALYZE_COMMAND = "AnalyzeCommand",
    GET_REPLY = "getReply",
}

type GeniescriptLogic = AsyncGenerator<CommandAnalysisResult | ReplyResult | null, any, LogicParameter>;

// TODO: rename this Agent
export class AbstractGeniescriptHandler implements DialogueHandler<GeniescriptAnalysisResult, string> {
    private _logic : GeniescriptLogic | null;

    protected constructor(public priority = DialogueHandler.Priority.PRIMARY, public icon : string | null = null) {
        console.log("AbstractGeniescriptHandler constructor");
        this._logic = null;
        if (this.constructor === AbstractGeniescriptHandler)
            throw new Error("Abstract classes can't be instantiated.");
    }

    getState() : string {
        // TODO: Implementation serialization
        return "geniescript state";
    }

    reset() : void {
        this._logic = this.logic();
        // noinspection JSIgnoredPromiseFromCall
        this._logic.next();
    }

    async initialize() {
        this._logic = this.logic();
        await this._logic.next();
        return null;
    }

    async analyzeCommand(utterance : string) : Promise<GeniescriptAnalysisResult> {
        console.log("AbstractGeniescriptHandler analyzeCommand");
        const result = await this._logic!.next({ type: LogicParameterType.ANALYZE_COMMAND, content: utterance });
        console.log(result.value);
        return result.value;
    }

    async getReply(analyzed : GeniescriptAnalysisResult | DialogueHandler.CommandAnalysisResult) : Promise<DialogueHandler.ReplyResult> {
        const result0 = this._logic!.next({ type: LogicParameterType.GET_REPLY, content: analyzed });
        const result = await result0;
        return result.value;
    }

    // TODO: call this main
    async *logic() : GeniescriptLogic {
        yield null;
        return null;
    }
}

export class GeniescriptDlg {
    private readonly _user_target : string;
    private readonly _skill_name : string;
    private _last_result : GeniescriptAnalysisResult | CommandAnalysisResult | ReplyResult | null;
    private _last_branch : string | null;
    private _last_analyzed : string | null;
    private _last_messages : string[];
    private _last_expecting : Type | null;
    private _last_target : string | null;


    constructor(user_target : string, skill_name : string) {
        this._user_target = user_target;
        this._skill_name = skill_name;
        this._last_result = null;
        this._last_branch = null;
        this._last_analyzed = null;
        this._last_messages = [];
        this._last_expecting = null;
        this._last_target = null;
    }

    async *expect(
        func_map : Map<string,
            (GeneratorFunction | AsyncGeneratorFunction | (() => Promise<any>)| (() => any))
            >
    ) : GeniescriptLogic {
        if (this._last_analyzed !== null) {
            this._last_result = {
                messages: this._last_messages,
                expecting: this._last_expecting,
                context: this._last_analyzed,
                agent_target: this._last_target!
            };
            this._last_messages = [];
            this._last_expecting = null;
            this._last_target = null;
            this._last_analyzed = null;
        }
        while (true) {
            const input = yield this._last_result;
            if (input.type === LogicParameterType.ANALYZE_COMMAND) {
                const content = input.content as string;
                this._last_result = {
                    confident: DialogueHandler.Confidence.OUT_OF_DOMAIN_COMMAND,
                    utterance: content,
                    user_target: ''
                };
                for (const func_key of func_map.keys()) {
                    const regExp = new RegExp(func_key, 'i');
                    const match = regExp.exec(content);
                    if (match) {
                        this._last_branch = func_key;
                        this._last_result = {
                            confident: DialogueHandler.Confidence.EXACT_IN_DOMAIN_COMMAND,
                            utterance: content,
                            user_target: this._user_target,
                            branch: func_key
                        };
                        break;
                    }
                }
            } else if (input.type === LogicParameterType.GET_REPLY) {
                const content = input.content as GeniescriptAnalysisResult;
                this._last_analyzed = content.user_target;
                const current_func = func_map.get(this._last_branch!)!;
                if (current_func.constructor.name === "GeneratorFunction" || current_func.constructor.name === "AsyncGeneratorFunction")
                    return yield* current_func();
                else if (current_func.constructor.name === "AsyncFunction" || current_func.constructor.name === "Function" )
                    return current_func();
                else
                    throw Error("current_func is not a Function or GeneratorFunction");
            }
        }
    }

    // TODO: say something in the middle of the process
    say(messages : string[], target : string | null = null , expecting : Type | null = null) {
        if (target === null) target = this._skill_name + ".reply";
        this._last_messages = this._last_messages.concat(messages);
        this._last_target = target;
        this._last_expecting = expecting;
    }


}