//
// Created by qlu on 2019/3/14.
//

#ifndef KUNGFU_NN_PUBLISHER_H
#define KUNGFU_NN_PUBLISHER_H

#include "msg.h"
#include "oms_struct.h"
#include <string>
#include <nn.hpp>
#include "nlohmann/json.hpp"

namespace kungfu
{
    class NNPublisher
    {
    public:
        NNPublisher(const std::string& url);

        void publish_order(const kungfu::Order& order) const;
        void publish_trade(const kungfu::Trade& trade) const ;
        void publish_pos(const kungfu::Position& pos) const ;
        void publish_portfolio_info(const kungfu::PortfolioInfo& portfolio, kungfu::MsgType msg_type = kungfu::MsgType::Portfolio) const ;
        void publish_account_info(const kungfu::AccountInfo& account_info, kungfu::MsgType msg_type = kungfu::MsgType::AccountInfo) const ;
        void publish_strategy_used_account(const kungfu::StrategyUsedAccountInfo& info) const;
        void publish(kungfu::MsgType msg_type, nlohmann::json& data) const ;

    private:
        std::shared_ptr<nn::socket> pub_socket_;
    };
}

#endif //KUNGFU_NN_PUBLISHER_H
